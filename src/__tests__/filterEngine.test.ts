import { describe, expect, it } from 'vitest';
import questionsData from '../data/questions.json';
import { filtrarQuestoes, normalizeText, matchesFilter } from '../services/filterEngine';
import { DEFAULT_FILTERS, isDefaultFilters } from '../constants/filters';
import type { Question, UserStats, RevisaoSRS } from '../types/schema';

describe('FilterEngine - Normalização, Robustez e Estado Inicial Não-Vazio', () => {
  const dummyStats: UserStats = {
    attempts: [],
    streak: 0,
    bestStreak: 0,
    blindSpotQueue: [],
    errorQueue: [],
    revisoesSRS: {},
    simuladosHistorico: [],
  };

  it('1. DEFAULT_FILTERS não oculta nenhuma questão e o app abre com todo o banco acessível', () => {
    expect(isDefaultFilters(DEFAULT_FILTERS)).toBe(true);
    const resultado = filtrarQuestoes(questionsData as Question[], DEFAULT_FILTERS, dummyStats);
    expect(resultado.length).toBe(questionsData.length);
    expect(resultado.length).toBe(175);
  });

  it('2. normalização remove acentos, diacríticos e normaliza caixa', () => {
    expect(normalizeText('Itanhaém')).toBe('itanhaem');
    expect(normalizeText('Alumínio/SP')).toBe('aluminio/sp');
    expect(normalizeText('VUNESP')).toBe('vunesp');
    expect(normalizeText('  CRASE  ')).toBe('crase');
    expect(normalizeText(undefined)).toBe('');
    expect(normalizeText(null)).toBe('');
  });

  it('3. matchesFilter trata "all", undefined, acentos e caixa alta/baixa uniformemente', () => {
    expect(matchesFilter('Itanhaém', 'all')).toBe(true);
    expect(matchesFilter(undefined, 'all')).toBe(true);
    expect(matchesFilter('Itanhaém', 'itanhaem')).toBe(true);
    expect(matchesFilter('itanhaem', 'Itanhaém')).toBe(true);
    expect(matchesFilter('VUNESP', 'vunesp')).toBe(true);
    expect(matchesFilter(undefined, 'VUNESP')).toBe(false);
  });

  it('4. busca textual normalizada encontra termos com ou sem acento', () => {
    // Busca por termo sem acento em questão que contém texto acentuado
    const filtrado = filtrarQuestoes(
      questionsData as Question[],
      { ...DEFAULT_FILTERS, termoBusca: 'licitacao' },
      dummyStats
    );
    expect(filtrado.length).toBeGreaterThan(0);
    expect(
      filtrado.some((q) =>
        normalizeText(q.statement + q.raioX + q.subtopic).includes('licitacao')
      )
    ).toBe(true);
  });

  it('5. lida corretamente com dados mistos (questões sem banca, sem cargo e sem órgão)', () => {
    const questoesMistas: Question[] = [
      {
        id: 'q-sem-metadados',
        category: 'Crase (VUNESP)',
        subtopic: 'Geral',
        statement: 'Questão sem metadados opcionais',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        raioX: 'Explicação',
        difficulty: 'Fácil',
      },
      {
        id: 'q-so-banca',
        category: 'Matemática e Raciocínio Lógico',
        subtopic: 'Aritmética',
        statement: 'Questão com apenas banca preenchida',
        options: ['A', 'B', 'C', 'D', 'E'],
        correctIndex: 1,
        raioX: 'Explicação',
        difficulty: 'Média',
        banca: 'VUNESP',
      },
      {
        id: 'q-completa',
        category: 'Conhecimentos Específicos - Agente Patrimonial',
        subtopic: 'Vigilância',
        statement: 'Questão com metadados completos de cargo e órgão',
        options: ['A', 'B', 'C', 'D', 'E'],
        correctIndex: 2,
        raioX: 'Explicação',
        difficulty: 'Difícil',
        banca: 'Instituto Nosso Rumo',
        orgao: 'Prefeitura de Itanhaém',
        cargo: 'Agente de Vigilância Patrimonial',
        cidade: 'Itanhaém',
        ano: 2026,
      },
    ];

    // Com DEFAULT_FILTERS, todas as 3 devem passar
    const todas = filtrarQuestoes(questoesMistas, DEFAULT_FILTERS, dummyStats);
    expect(todas).toHaveLength(3);

    // Filtro por banca VUNESP: deve incluir q-so-banca e q-sem-metadados (categoria VUNESP)
    const vunesp = filtrarQuestoes(questoesMistas, { ...DEFAULT_FILTERS, banca: 'VUNESP' }, dummyStats);
    expect(vunesp.some((q) => q.id === 'q-so-banca')).toBe(true);
    expect(vunesp.some((q) => q.id === 'q-sem-metadados')).toBe(true);
    expect(vunesp.some((q) => q.id === 'q-completa')).toBe(false);

    // Filtro estrito por cargo: apenas q-completa passa
    const cargo = filtrarQuestoes(
      questoesMistas,
      { ...DEFAULT_FILTERS, cargo: 'Agente de Vigilância Patrimonial' },
      dummyStats
    );
    expect(cargo).toHaveLength(1);
    expect(cargo[0].id).toBe('q-completa');
  });

  it('6. filtra corretamente pendentes_srs respeitando o calendário civil e dominadas', () => {
    const hoje = new Date('2026-10-24T12:00:00Z').getTime();
    const ontem = new Date('2026-10-23T12:00:00Z').getTime();
    const amanha = new Date('2026-10-25T12:00:00Z').getTime();

    const mockQuestoes: Question[] = [
      {
        id: 'q-pendente-ontem',
        category: 'Crase (VUNESP)',
        subtopic: 'Pronomes',
        statement: 'Questão vencida ontem',
        options: ['A', 'B'],
        correctIndex: 0,
        raioX: 'Macete',
        difficulty: 'Fácil',
      },
      {
        id: 'q-revisada-hoje',
        category: 'Crase (VUNESP)',
        subtopic: 'Horas',
        statement: 'Questão respondida hoje',
        options: ['A', 'B'],
        correctIndex: 1,
        raioX: 'Macete',
        difficulty: 'Média',
      },
      {
        id: 'q-futura',
        category: 'Nova Lei de Licitações (Lei 14.133/2021)',
        subtopic: 'Dispensa',
        statement: 'Questão agendada para amanhã',
        options: ['A', 'B'],
        correctIndex: 0,
        raioX: 'Macete',
        difficulty: 'Fácil',
      },
      {
        id: 'q-dominada',
        category: 'Gestão de Patrimônio e Bens Públicos',
        subtopic: 'Desafetação',
        statement: 'Questão dominada caixa 5',
        options: ['A', 'B'],
        correctIndex: 0,
        raioX: 'Macete',
        difficulty: 'Difícil',
      },
    ];

    const srsMap: Record<string, RevisaoSRS> = {
      'q-pendente-ontem': {
        perguntaId: 'q-pendente-ontem',
        caixa: 1,
        intervaloDias: 1,
        proximaRevisao: ontem,
        historicoRepeticoes: 1,
        lapses: 0,
        status: 'pendente',
        ultimaRevisao: ontem - 86400000,
      },
      'q-revisada-hoje': {
        perguntaId: 'q-revisada-hoje',
        caixa: 2,
        intervaloDias: 3,
        proximaRevisao: amanha,
        historicoRepeticoes: 2,
        lapses: 0,
        status: 'em_revisao',
        ultimaRevisao: hoje, // já respondida hoje no fuso
      },
      'q-futura': {
        perguntaId: 'q-futura',
        caixa: 1,
        intervaloDias: 1,
        proximaRevisao: amanha,
        historicoRepeticoes: 1,
        lapses: 0,
        status: 'em_revisao',
        ultimaRevisao: ontem,
      },
      'q-dominada': {
        perguntaId: 'q-dominada',
        caixa: 5,
        intervaloDias: 30,
        proximaRevisao: hoje + 30 * 86400000,
        historicoRepeticoes: 5,
        lapses: 0,
        status: 'dominado',
        ultimaRevisao: hoje,
      },
    };

    const statsComSRS: UserStats = {
      ...dummyStats,
      revisoesSRS: srsMap,
    };

    // Teste 6.1: pendentes_srs sem passar 4º parâmetro (fallback para stats.revisoesSRS)
    const pendentes = filtrarQuestoes(
      mockQuestoes,
      { ...DEFAULT_FILTERS, statusEstudo: 'pendentes_srs' },
      statsComSRS,
      undefined,
      hoje
    );
    expect(pendentes).toHaveLength(1);
    expect(pendentes[0].id).toBe('q-pendente-ontem');

    // Teste 6.2: dominadas
    const dominadas = filtrarQuestoes(
      mockQuestoes,
      { ...DEFAULT_FILTERS, statusEstudo: 'dominadas' },
      statsComSRS,
      undefined,
      hoje
    );
    expect(dominadas).toHaveLength(1);
    expect(dominadas[0].id).toBe('q-dominada');
  });
});

