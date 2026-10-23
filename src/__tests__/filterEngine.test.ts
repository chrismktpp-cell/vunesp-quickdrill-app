import { describe, expect, it } from 'vitest';
import questionsData from '../data/questions.json';
import { filtrarQuestoes, normalizeText, matchesFilter } from '../services/filterEngine';
import { DEFAULT_FILTERS, isDefaultFilters } from '../constants/filters';
import type { Question, UserStats } from '../types/schema';

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
});
