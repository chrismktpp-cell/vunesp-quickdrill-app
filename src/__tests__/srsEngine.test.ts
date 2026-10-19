import { describe, it, expect } from 'vitest';
import {
  INTERVALOS_CAIXA_DIAS,
  criarRevisaoInicial,
  processarRespostaSRS,
  estaPendenteParaRevisao,
  gerarFilaDoDia,
  resumirSRS,
} from '../services/srsEngine';
import type { Question, RevisaoSRS } from '../types/schema';

const mockPerguntas: Question[] = [
  {
    id: 'q-1',
    category: 'Crase (VUNESP)',
    subtopic: 'Pronomes',
    statement: 'Questao 1',
    options: ['A', 'B'],
    correctIndex: 0,
    raioX: 'Macete 1',
    difficulty: 'Fácil',
  },
  {
    id: 'q-2',
    category: 'Crase (VUNESP)',
    subtopic: 'Horas',
    statement: 'Questao 2',
    options: ['A', 'B'],
    correctIndex: 0,
    raioX: 'Macete 2',
    difficulty: 'Média',
  },
  {
    id: 'q-3',
    category: 'Nova Lei de Licitações (Lei 14.133/2021)',
    subtopic: 'Dispensa',
    statement: 'Questao 3',
    options: ['A', 'B'],
    correctIndex: 1,
    raioX: 'Macete 3',
    difficulty: 'Difícil',
  },
];

describe('SRS Engine (SM-2 & Leitner)', () => {
  const agora = 1700000000000;
  const umDiaMs = 24 * 60 * 60 * 1000;

  it('deve criar revisão inicial com caixa 1 e intervalo de 1 dia', () => {
    const srs = criarRevisaoInicial('q-1', agora);
    expect(srs.perguntaId).toBe('q-1');
    expect(srs.caixa).toBe(1);
    expect(srs.intervaloDias).toBe(1);
    expect(srs.proximaRevisao).toBe(agora + umDiaMs);
    expect(srs.fatorFacilidade).toBe(2.5);
    expect(srs.lapses).toBe(0);
    expect(srs.status).toBe('pendente');
  });

  it('deve avançar de caixa ao acertar com Certeza (3)', () => {
    const inicial = criarRevisaoInicial('q-1', agora);
    const atualizado = processarRespostaSRS(inicial, 'q-1', true, 3, agora);

    expect(atualizado.caixa).toBe(2);
    expect(atualizado.intervaloDias).toBe(INTERVALOS_CAIXA_DIAS[2]); // 3 dias
    expect(atualizado.proximaRevisao).toBe(agora + 3 * umDiaMs);
    expect(atualizado.status).toBe('em_revisao');
    expect(atualizado.fatorFacilidade).toBe(2.6);
  });

  it('deve atingir status "dominado" ao alcançar caixa 5 com sucessos consecutivos', () => {
    let srs = criarRevisaoInicial('q-1', agora);
    // Acertos consecutivos com certeza
    srs = processarRespostaSRS(srs, 'q-1', true, 3, agora); // Caixa 2
    srs = processarRespostaSRS(srs, 'q-1', true, 3, agora); // Caixa 3
    srs = processarRespostaSRS(srs, 'q-1', true, 3, agora); // Caixa 4
    srs = processarRespostaSRS(srs, 'q-1', true, 3, agora); // Caixa 5

    expect(srs.caixa).toBe(5);
    expect(srs.intervaloDias).toBe(30);
    expect(srs.status).toBe('dominado');
  });

  it('não deve avançar de caixa se acertar com Chute (1) - Acerto Frágil', () => {
    const inicial = criarRevisaoInicial('q-1', agora);
    const atualizado = processarRespostaSRS(inicial, 'q-1', true, 1, agora);

    expect(atualizado.caixa).toBe(1);
    expect(atualizado.intervaloDias).toBe(1);
    expect(atualizado.status).toBe('em_revisao');
  });

  it('deve resetar para caixa 1 e registrar lapse ao errar com Certeza (Ponto Cego)', () => {
    // Usuário estava na caixa 4
    const srsAvancado: RevisaoSRS = {
      perguntaId: 'q-1',
      caixa: 4,
      intervaloDias: 14,
      proximaRevisao: agora + 14 * umDiaMs,
      historicoRepeticoes: 4,
      fatorFacilidade: 2.7,
      lapses: 0,
      status: 'em_revisao',
      ultimaRevisao: agora,
    };

    const aposErro = processarRespostaSRS(srsAvancado, 'q-1', false, 3, agora);

    expect(aposErro.caixa).toBe(1);
    expect(aposErro.intervaloDias).toBe(1);
    expect(aposErro.lapses).toBe(1);
    expect(aposErro.status).toBe('pendente');
    expect(aposErro.fatorFacilidade).toBe(2.4); // Penalidade de 0.3
  });

  it('deve identificar se a questão está pendente para revisão na data', () => {
    const srs: RevisaoSRS = {
      perguntaId: 'q-1',
      caixa: 2,
      intervaloDias: 3,
      proximaRevisao: agora + 3 * umDiaMs,
      historicoRepeticoes: 2,
      fatorFacilidade: 2.5,
      lapses: 0,
      status: 'em_revisao',
      ultimaRevisao: agora,
    };

    // Antes da data alvo: não pendente
    expect(estaPendenteParaRevisao(srs, agora + 2 * umDiaMs)).toBe(false);

    // No dia exato ou depois: pendente
    expect(estaPendenteParaRevisao(srs, agora + 3 * umDiaMs)).toBe(true);
    expect(estaPendenteParaRevisao(srs, agora + 4 * umDiaMs)).toBe(true);
  });

  it('deve gerar a Fila do Dia priorizando revisões pendentes antes de novas questões', () => {
    const srsMap: Record<string, RevisaoSRS> = {
      'q-1': {
        perguntaId: 'q-1',
        caixa: 1,
        intervaloDias: 1,
        proximaRevisao: agora - 1000, // Venceu
        historicoRepeticoes: 1,
        fatorFacilidade: 2.5,
        lapses: 0,
        status: 'em_revisao',
        ultimaRevisao: agora - umDiaMs,
      },
      'q-2': {
        perguntaId: 'q-2',
        caixa: 3,
        intervaloDias: 7,
        proximaRevisao: agora + 5 * umDiaMs, // Ainda não venceu
        historicoRepeticoes: 3,
        fatorFacilidade: 2.5,
        lapses: 0,
        status: 'em_revisao',
        ultimaRevisao: agora,
      },
      // 'q-3' é nova, não tem SRS
    };

    const fila = gerarFilaDoDia(mockPerguntas, srsMap, 5, agora);

    expect(fila.revisoesPendentes.length).toBe(1);
    expect(fila.revisoesPendentes[0].id).toBe('q-1');

    expect(fila.novasQuestoes.length).toBe(1);
    expect(fila.novasQuestoes[0].id).toBe('q-3');

    expect(fila.totalHoje).toBe(2);
  });

  it('deve resumir as estatísticas de SRS com precisão', () => {
    const srsMap: Record<string, RevisaoSRS> = {
      'q-1': {
        perguntaId: 'q-1',
        caixa: 5,
        intervaloDias: 30,
        proximaRevisao: agora + 30 * umDiaMs,
        historicoRepeticoes: 5,
        fatorFacilidade: 2.8,
        lapses: 0,
        status: 'dominado',
        ultimaRevisao: agora,
      },
      'q-2': {
        perguntaId: 'q-2',
        caixa: 1,
        intervaloDias: 1,
        proximaRevisao: agora - 10,
        historicoRepeticoes: 2,
        fatorFacilidade: 2.2,
        lapses: 1,
        status: 'pendente',
        ultimaRevisao: agora - umDiaMs,
      },
    };

    const resumo = resumirSRS(mockPerguntas, srsMap, agora);
    expect(resumo.totalQuestoes).toBe(3);
    expect(resumo.novas).toBe(1); // q-3
    expect(resumo.dominadas).toBe(1); // q-1
    expect(resumo.emRevisao).toBe(1); // q-2
    expect(resumo.pendentesHoje).toBe(1); // q-2
    expect(resumo.pontosCegosComLapse).toBe(1); // q-2
  });
});

