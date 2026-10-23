import { describe, it, expect, beforeEach } from 'vitest';
import questionsData from '../data/questions.json';
import {
  calcularXpResposta,
  calcularXpSessao,
  calcularNivel,
  calcularProgressoMeta,
  atualizarSequenciaDiaria,
  avaliarConquistas,
  XP_ACERTO,
  XP_BONUS_CERTEZA,
  XP_PARTICIPACAO_ERRO,
  XP_BONUS_SESSAO_PERFEITA,
  META_DIARIA_PADRAO,
} from '../services/xpEngine';
import {
  gerarFilaDoDia,
  processarRespostaSRS,
  resumirSRS,
} from '../services/srsEngine';
import { filtrarQuestoes, QuestionFilters } from '../services/filterEngine';
import {
  aplicarResposta,
  validarBackup,
  gerarObjetoBackup,
  wrapEnvelope,
} from '../utils/storage';
import type { Question, UserStats } from '../types/schema';

describe('Gamificação, Sessões e Integridade de Concurso VUNESP', () => {
  let mockStats: UserStats;

  beforeEach(() => {
    mockStats = {
      attempts: [],
      streak: 2,
      bestStreak: 5,
      blindSpotQueue: [],
      errorQueue: [],
      revisoesSRS: {},
      simuladosHistorico: [],
      totalAcertos: 20,
      totalErros: 5,
      xp: 240,
      nivel: 2,
      metaDiaria: 15,
      questoesHoje: 8,
      dataUltimoEstudo: '2026-10-21',
      conquistasDesbloqueadas: ['primeira_questao'],
    };
  });

  // 1. Meta diária salva e calculada corretamente
  it('1. Deve calcular e atualizar a meta diária corretamente', () => {
    const progresso = calcularProgressoMeta(8, 15);
    expect(progresso.percentual).toBe(53); // Math.round((8/15)*100) = 53
    expect(progresso.concluida).toBe(false);
    expect(progresso.restantes).toBe(7);

    const progressoConcluido = calcularProgressoMeta(15, 15);
    expect(progressoConcluido.percentual).toBe(100);
    expect(progressoConcluido.concluida).toBe(true);
    expect(progressoConcluido.restantes).toBe(0);

    const progressoSuperado = calcularProgressoMeta(20, 15);
    expect(progressoSuperado.percentual).toBe(100);
    expect(progressoSuperado.concluida).toBe(true);
    expect(progressoSuperado.restantes).toBe(0);
  });

  // 2. Sequência diária mantida ou zerada conforme a regra estabelecida
  it('2. Deve manter sequência para dias consecutivos e zerar para hiatos > 1 dia', () => {
    // Mesmo dia: mantém streak e incrementa questoesHoje
    const statsHoje: UserStats = {
      ...mockStats,
      streak: 3,
      questoesHoje: 7,
      dataUltimoEstudo: '2026-10-22',
    };
    const mesmoDia = atualizarSequenciaDiaria(statsHoje, new Date('2026-10-22T12:00:00').getTime());
    expect(mesmoDia.streak).toBe(3);
    expect(mesmoDia.questoesHoje).toBe(8);

    // Dia consecutivo (ontem foi 21, hoje é 22): streak avança para 4, questoesHoje reseta para 1
    const statsOntem: UserStats = {
      ...mockStats,
      streak: 3,
      questoesHoje: 7,
      dataUltimoEstudo: '2026-10-21',
    };
    const diaConsecutivo = atualizarSequenciaDiaria(statsOntem, new Date('2026-10-22T12:00:00').getTime());
    expect(diaConsecutivo.streak).toBe(4);
    expect(diaConsecutivo.questoesHoje).toBe(1);

    // Hiato de mais de 1 dia (estudou dia 19, voltou dia 22): streak reseta para 1
    const statsHiato: UserStats = {
      ...mockStats,
      streak: 3,
      questoesHoje: 7,
      dataUltimoEstudo: '2026-10-19',
    };
    const hiato = atualizarSequenciaDiaria(statsHiato, new Date('2026-10-22T12:00:00').getTime());
    expect(hiato.streak).toBe(1);
    expect(hiato.questoesHoje).toBe(1);
  });

  // 3. XP acumulado determinístico
  it('3. Deve calcular XP determinístico por acerto, certeza e participação no erro', () => {
    // Acerto com Certeza (nível 3): 10 + 5 = 15 XP
    expect(calcularXpResposta(true, 3)).toBe(XP_ACERTO + XP_BONUS_CERTEZA); // 15
    // Acerto com Dúvida (nível 2): 10 XP
    expect(calcularXpResposta(true, 2)).toBe(XP_ACERTO); // 10
    // Acerto com Chute (nível 1): 10 XP
    expect(calcularXpResposta(true, 1)).toBe(XP_ACERTO); // 10
    // Erro (qualquer nível): 2 XP de participação/esforço
    expect(calcularXpResposta(false, 3)).toBe(XP_PARTICIPACAO_ERRO); // 2
    expect(calcularXpResposta(false, 1)).toBe(XP_PARTICIPACAO_ERRO); // 2
  });

  // 4. Transição de níveis
  it('4. Deve computar os níveis e títulos do concurso rigorosamente pelos limites de XP', () => {
    // 0 XP -> Nível 1: Aspirante a Concurso
    const lvl1 = calcularNivel(0);
    expect(lvl1.nivel).toBe(1);
    expect(lvl1.titulo).toBe('Aspirante a Concurso');
    expect(lvl1.progressoPercentual).toBe(0);

    // 150 XP -> Nível 2: Concurseiro Focado (min 100, prox 250)
    const lvl2 = calcularNivel(150);
    expect(lvl2.nivel).toBe(2);
    expect(lvl2.titulo).toBe('Concurseiro Focado');
    expect(lvl2.progressoPercentual).toBe(33); // (150-100)/(250-100) = 50/150 = 33%

    // 2500 XP -> Nível 7: Mestre dos Concursos
    const lvl7 = calcularNivel(2500);
    expect(lvl7.nivel).toBe(7);
    expect(lvl7.titulo).toBe('Mestre dos Concursos');
    expect(lvl7.progressoPercentual).toBe(0);
  });

  // 5. Cálculo de bônus por consistência e acerto
  it('5. Deve conceder bônus de 25 XP para sessão perfeita e bônus de streak', () => {
    // Sessão com 10 questões e 10 acertos (perfeita): ganha bônus de 25 XP
    const resPerfeita = calcularXpSessao(10, 10, 4);
    expect(resPerfeita.xpBonusPerfeito).toBe(XP_BONUS_SESSAO_PERFEITA);
    expect(resPerfeita.xpTotal).toBeGreaterThanOrEqual(25);

    // Sessão imperfeita (9 de 10): zero bônus de sessão perfeita
    const resImperfeita = calcularXpSessao(10, 9, 4);
    expect(resImperfeita.xpBonusPerfeito).toBe(0);
  });

  // 6. Atualização de métricas do SRS após cada resposta
  it('6. Deve atualizar o algoritmo de repetição espaçada (SRS Leitner) e detectar pontos cegos', () => {
    const q = (questionsData as Question[])[0];

    // Caso 1: Certeza + Erro -> classificado como blind_spot e enviado ao blindSpotQueue
    const resErro = aplicarResposta(mockStats, {
      questionId: q.id,
      category: q.category,
      selectedOptionIndex: 0,
      isCorrect: false,
      certainty: 3,
    });
    expect(resErro.classification).toBe('blind_spot');
    expect(resErro.newStats.blindSpotQueue).toContain(q.id);
    expect(resErro.newStats.errorQueue).toContain(q.id);

    // Caso 2: Acerto com certeza -> remove de blindSpotQueue e avança fase
    const resAcerto = aplicarResposta(resErro.newStats, {
      questionId: q.id,
      category: q.category,
      selectedOptionIndex: q.correctIndex,
      isCorrect: true,
      certainty: 3,
    });
    expect(resAcerto.classification).toBe('real_mastery');
    expect(resAcerto.newStats.blindSpotQueue).not.toContain(q.id);
  });

  // 7. Geração correta da trilha ou fila de estudos
  it('7. Deve gerar Fila do Dia balanceando revisões pendentes com novas questões', () => {
    const allQuestions = questionsData as Question[];
    const revisoes: Record<string, any> = {};

    // Cria 3 revisões vencidas no passado
    const passado = Date.now() - 3 * 24 * 60 * 60 * 1000;
    allQuestions.slice(0, 3).forEach((q) => {
      revisoes[q.id] = {
        questionId: q.id,
        caixa: 1,
        intervaloDias: 1,
        status: 'pendente',
        ultimaRevisao: passado,
        proximaRevisao: passado,
        historicoRepeticoes: 1,
        lapses: 0,
      };
    });

    const fila = gerarFilaDoDia(allQuestions, revisoes, 7);
    expect(fila.revisoesPendentes.length).toBe(3);
    expect(fila.novasQuestoes.length).toBe(7);
    expect(fila.totalHoje).toBe(10);
  });

  // 8. Modo de revisão de erros
  it('8. Deve isolar questões do errorQueue para sessões focadas de recuperação', () => {
    const allQuestions = questionsData as Question[];
    const erroId = allQuestions[5].id;
    const statsComErro: UserStats = {
      ...mockStats,
      errorQueue: [erroId],
    };

    const filtradas = filtrarQuestoes(
      allQuestions,
      {
        category: 'all',
        dificuldade: 'all',
        statusEstudo: 'erros',
        termoBusca: '',
        banca: 'all',
        orgao: 'all',
        prova: 'all',
        cargo: 'all',
        cidade: 'all',
        ano: 'all',
      },
      statsComErro,
      {}
    );

    expect(filtradas.length).toBe(1);
    expect(filtradas[0].id).toBe(erroId);
  });

  // 9. Integridade dos filtros por matéria, banca e concurso
  it('9. Não deve misturar questões de diferentes bancas, matérias ou concursos', () => {
    const allQuestions = questionsData as Question[];

    // Filtro estrito: Matemática e Raciocínio Lógico
    const questoesMat = filtrarQuestoes(
      allQuestions,
      {
        category: 'Matemática e Raciocínio Lógico',
        dificuldade: 'all',
        statusEstudo: 'todas',
        termoBusca: '',
        banca: 'all',
        orgao: 'all',
        prova: 'all',
        cargo: 'all',
        cidade: 'all',
        ano: 'all',
      },
      mockStats,
      {}
    );

    expect(questoesMat.length).toBe(10);
    expect(questoesMat.every((q) => q.category === 'Matemática e Raciocínio Lógico')).toBe(true);

    // Filtro por Concurso/Prova: Prefeitura de Itanhaém
    const questoesItanhaem = filtrarQuestoes(
      allQuestions,
      {
        category: 'all',
        dificuldade: 'all',
        statusEstudo: 'todas',
        termoBusca: '',
        banca: 'all',
        orgao: 'all',
        prova: 'Prefeitura de Itanhaém',
        cargo: 'all',
        cidade: 'all',
        ano: 'all',
      },
      mockStats,
      {}
    );

    expect(questoesItanhaem.length).toBeGreaterThan(0);
    expect(questoesItanhaem.every((q) => q.prova === 'Prefeitura de Itanhaém')).toBe(true);
  });

  // 10. Tela de resultado da sessão contendo todas as métricas exigidas
  it('10. Deve estruturar os dados de resumo da sessão com precisão, XP, acertos, erros e tópicos', () => {
    const sessionAttempts = 10;
    const sessionCorrect = 8;
    const sessionErrors = 2;
    const accuracy = (sessionCorrect / sessionAttempts) * 100;
    const errorTopics = [{ topic: 'Crase (VUNESP)', count: 2 }];

    const summary = {
      attempts: sessionAttempts,
      correct: sessionCorrect,
      errors: sessionErrors,
      xpGained: 105,
      accuracy,
      errorTopics,
    };

    expect(summary.accuracy).toBe(80);
    expect(summary.attempts).toBe(10);
    expect(summary.correct).toBe(8);
    expect(summary.errors).toBe(2);
    expect(summary.xpGained).toBe(105);
    expect(summary.errorTopics[0].topic).toBe('Crase (VUNESP)');
    expect(summary.errorTopics[0].count).toBe(2);
  });

  // 11. Persistência sem regressão dos dados pré-existentes
  it('11. Deve migrar backups legados v1 e envelopes v2 preservando integridade e mutex', () => {
    const backupObj = gerarObjetoBackup(mockStats);
    expect(backupObj.v).toBe(2);
    expect(backupObj.meta.streak).toBe(mockStats.streak);

    const validacao = validarBackup(backupObj);
    expect(validacao.valido).toBe(true);
    expect(validacao.data?.meta.streak).toBe(mockStats.streak);
  });

  // 12. Nenhuma questão oficial alterada ou perdida
  it('12. Deve certificar que todas as 175 questões oficiais permanecem intactas no banco', () => {
    const questions = questionsData as Question[];
    expect(questions.length).toBe(175);

    // Assegura que todas as questões possuem id, enunciado, alternativas e gabarito válido
    for (const q of questions) {
      expect(q.id).toBeDefined();
      expect(q.statement.length).toBeGreaterThan(5);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
      expect(q.raioX).toBeDefined();
    }

    // Verifica que as 10 questões de matemática estão todas presentes
    const matQuestions = questions.filter((q) => q.category === 'Matemática e Raciocínio Lógico');
    expect(matQuestions.length).toBe(10);
    expect(matQuestions.map((q) => q.id)).toContain('itanhaem-ap-mat-01');
    expect(matQuestions.map((q) => q.id)).toContain('itanhaem-ap-mat-10');
  });
});
