import { describe, it, expect } from 'vitest';
import {
  INTERVALOS_CAIXA_DIAS,
  criarRevisaoInicial,
  processarRespostaSRS,
  estaPendenteParaRevisao,
  gerarFilaDoDia,
  resumirSRS,
  formatarDataCivilLocal,
  shuffleComSeed,
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
  {
    id: 'q-4',
    category: 'Gestão de Patrimônio e Bens Públicos',
    subtopic: 'Bens de Uso Comum',
    statement: 'Questao 4',
    options: ['A', 'B'],
    correctIndex: 0,
    raioX: 'Macete 4',
    difficulty: 'Média',
  },
  {
    id: 'q-5',
    category: 'Sujeito Oracional e Transitividade',
    subtopic: 'Concordância Verbal',
    statement: 'Questao 5',
    options: ['A', 'B'],
    correctIndex: 1,
    raioX: 'Macete 5',
    difficulty: 'Fácil',
  },
];

describe('SRS Engine (Leitner com regras explícitas de certeza)', () => {
  // Fixa um timestamp para teste (2026-10-19 12:00:00 UTC)
  const agora = new Date('2026-10-19T12:00:00Z').getTime();
  const umDiaMs = 24 * 60 * 60 * 1000;

  it('deve criar revisão inicial com caixa 1 e intervalo de 1 dia (sem fatorFacilidade)', () => {
    const srs = criarRevisaoInicial('q-1', agora);
    expect(srs.perguntaId).toBe('q-1');
    expect(srs.caixa).toBe(1);
    expect(srs.intervaloDias).toBe(1);
    expect(srs.proximaRevisao).toBe(agora + umDiaMs);
    expect(srs.lapses).toBe(0);
    expect(srs.status).toBe('pendente');
    expect((srs as any).fatorFacilidade).toBeUndefined();
  });

  it('deve avançar 1 caixa ao acertar com Certeza 3 e atingir "dominado" apenas na caixa 5', () => {
    let srs = criarRevisaoInicial('q-1', agora);

    // Acerto 1 com Certeza 3 -> Caixa 2
    srs = processarRespostaSRS(srs, 'q-1', true, 3, agora);
    expect(srs.caixa).toBe(2);
    expect(srs.intervaloDias).toBe(INTERVALOS_CAIXA_DIAS[2]); // 3 dias
    expect(srs.status).toBe('em_revisao');

    // Acerto 2 com Certeza 3 -> Caixa 3
    srs = processarRespostaSRS(srs, 'q-1', true, 3, agora);
    expect(srs.caixa).toBe(3);
    expect(srs.status).toBe('em_revisao');

    // Acerto 3 com Certeza 3 -> Caixa 4
    srs = processarRespostaSRS(srs, 'q-1', true, 3, agora);
    expect(srs.caixa).toBe(4);
    expect(srs.status).toBe('em_revisao');

    // Acerto 4 com Certeza 3 -> Caixa 5 (Dominado)
    srs = processarRespostaSRS(srs, 'q-1', true, 3, agora);
    expect(srs.caixa).toBe(5);
    expect(srs.intervaloDias).toBe(INTERVALOS_CAIXA_DIAS[5]); // 30 dias
    expect(srs.status).toBe('dominado');
  });

  it('acerto com Certeza 2 (Dúvida) deve subir no máximo 1 caixa, com teto na caixa 3 e sem dominar', () => {
    let srs = criarRevisaoInicial('q-1', agora); // Caixa 1

    // Acerto com Certeza 2: sobe de 1 para 2
    srs = processarRespostaSRS(srs, 'q-1', true, 2, agora);
    expect(srs.caixa).toBe(2);
    expect(srs.status).toBe('em_revisao');

    // Acerto com Certeza 2: sobe de 2 para 3
    srs = processarRespostaSRS(srs, 'q-1', true, 2, agora);
    expect(srs.caixa).toBe(3);
    expect(srs.status).toBe('em_revisao');

    // Acerto com Certeza 2: na caixa 3, bate no teto 3 e não sobe mais nem domina
    srs = processarRespostaSRS(srs, 'q-1', true, 2, agora);
    expect(srs.caixa).toBe(3);
    expect(srs.status).toBe('em_revisao');
    expect(srs.status).not.toBe('dominado');
  });

  it('não deve avançar de caixa se acertar com Chute (1)', () => {
    const inicial = criarRevisaoInicial('q-1', agora);
    const atualizado = processarRespostaSRS(inicial, 'q-1', true, 1, agora);

    expect(atualizado.caixa).toBe(1);
    expect(atualizado.intervaloDias).toBe(1);
    expect(atualizado.status).toBe('em_revisao');
  });

  it('deve resetar para caixa 1 e registrar lapse ao errar', () => {
    const srsAvancado: RevisaoSRS = {
      perguntaId: 'q-1',
      caixa: 4,
      intervaloDias: 14,
      proximaRevisao: agora + 14 * umDiaMs,
      historicoRepeticoes: 4,
      lapses: 0,
      status: 'em_revisao',
      ultimaRevisao: agora - 5 * umDiaMs,
    };

    const aposErro = processarRespostaSRS(srsAvancado, 'q-1', false, 3, agora);
    expect(aposErro.caixa).toBe(1);
    expect(aposErro.intervaloDias).toBe(1);
    expect(aposErro.lapses).toBe(1);
    expect(aposErro.status).toBe('pendente');
  });

  it('não deve incluir questão na fila de pendentes se já foi respondida no mesmo dia civil', () => {
    // Questão respondida hoje (mesmo dia civil local)
    const srsRespondidoHoje: RevisaoSRS = {
      perguntaId: 'q-1',
      caixa: 1,
      intervaloDias: 1,
      proximaRevisao: agora - 1000, // mesmo com proximaRevisao vencida
      historicoRepeticoes: 1,
      lapses: 0,
      status: 'em_revisao',
      ultimaRevisao: agora, // respondida hoje
    };

    expect(estaPendenteParaRevisao(srsRespondidoHoje, agora)).toBe(false);

    // Se a última revisão foi no dia anterior (ontem), e proximaRevisao é hoje ou antes, deve ser pendente
    const srsRespondidoOntem: RevisaoSRS = {
      ...srsRespondidoHoje,
      ultimaRevisao: agora - umDiaMs,
      proximaRevisao: agora,
    };

    expect(estaPendenteParaRevisao(srsRespondidoOntem, agora)).toBe(true);
  });

  it('gerarFilaDoDia: duas chamadas na mesma data local devolvem exatamente as mesmas novas questões na mesma ordem', () => {
    const srsMap: Record<string, RevisaoSRS> = {};

    const filaA = gerarFilaDoDia(mockPerguntas, srsMap, 3, agora);
    const filaB = gerarFilaDoDia(mockPerguntas, srsMap, 3, agora);

    expect(filaA.novasQuestoes.length).toBe(3);
    expect(filaB.novasQuestoes.length).toBe(3);
    expect(filaA.novasQuestoes.map((q) => q.id)).toEqual(filaB.novasQuestoes.map((q) => q.id));
  });

  it('gerarFilaDoDia prioriza revisões pendentes antes de novas questões', () => {
    const srsMap: Record<string, RevisaoSRS> = {
      'q-1': {
        perguntaId: 'q-1',
        caixa: 1,
        intervaloDias: 1,
        proximaRevisao: agora - 5000,
        historicoRepeticoes: 1,
        lapses: 0,
        status: 'em_revisao',
        ultimaRevisao: agora - 2 * umDiaMs,
      },
    };

    const fila = gerarFilaDoDia(mockPerguntas, srsMap, 2, agora);
    expect(fila.revisoesPendentes.length).toBe(1);
    expect(fila.revisoesPendentes[0].id).toBe('q-1');
    expect(fila.novasQuestoes.length).toBe(2);
    expect(fila.totalHoje).toBe(3);
  });

  it('resumirSRS calcula estatísticas considerando apenas pendentes reais', () => {
    const srsMap: Record<string, RevisaoSRS> = {
      'q-1': {
        perguntaId: 'q-1',
        caixa: 5,
        intervaloDias: 30,
        proximaRevisao: agora + 30 * umDiaMs,
        historicoRepeticoes: 5,
        lapses: 0,
        status: 'dominado',
        ultimaRevisao: agora - umDiaMs,
      },
      'q-2': {
        perguntaId: 'q-2',
        caixa: 1,
        intervaloDias: 1,
        proximaRevisao: agora - umDiaMs,
        historicoRepeticoes: 2,
        lapses: 1,
        status: 'pendente',
        ultimaRevisao: agora - 2 * umDiaMs,
      },
    };

    const resumo = resumirSRS(mockPerguntas, srsMap, agora);
    expect(resumo.totalQuestoes).toBe(5);
    expect(resumo.novas).toBe(3); // q-3, q-4, q-5
    expect(resumo.dominadas).toBe(1); // q-1
    expect(resumo.emRevisao).toBe(1); // q-2
    expect(resumo.pendentesHoje).toBe(1); // q-2
    expect(resumo.pontosCegosComLapse).toBe(1); // q-2
  });

  describe('formatarDataCivilLocal', () => {
    it('deve formatar Date e timestamp com zero-padding para YYYY-MM-DD usando calendário local', () => {
      const data = new Date(2026, 2, 5, 23, 45, 0); // 5 de março de 2026, 23h45 local
      expect(formatarDataCivilLocal(data)).toBe('2026-03-05');
      expect(formatarDataCivilLocal(data.getTime())).toBe('2026-03-05');
    });

    it('mantém o dia civil local correto mesmo em horários noturnos (ex: 22h no Brasil)', () => {
      // Cria uma data às 22h local do dia 19
      const dataNoite = new Date(2026, 9, 19, 22, 0, 0); // 19 de outubro de 2026, 22h local
      const formatado = formatarDataCivilLocal(dataNoite);
      expect(formatado).toBe('2026-10-19');
    });
  });
});
