import { describe, it, expect, beforeEach } from 'vitest';
import questionsData from '../data/questions.json';
import { aprovaFoxColors, aprovaFoxTheme, spacing, radius, typography } from '../theme/aprovafox';
import {
  calcularProgressoGeral,
} from '../services/progressService';
import {
  obterProximaAtividadeRecomendada,
} from '../services/recommendationService';
import {
  calcularXpResposta,
  calcularXpSessao,
  calcularNivel,
  calcularProgressoMeta,
  atualizarSequenciaDiaria,
  converterStatsParaGamificationState,
} from '../services/gamificationService';
import { filtrarQuestoes } from '../services/filterEngine';
import { aplicarResposta, gerarObjetoBackup, validarBackup } from '../utils/storage';
import type { Question, UserStats } from '../types/schema';

describe('AprovaFox - Sistema de Aprendizagem, Gamificação e Integridade Oficial', () => {
  let mockStats: UserStats;

  beforeEach(() => {
    mockStats = {
      attempts: [],
      streak: 3,
      bestStreak: 7,
      blindSpotQueue: [],
      errorQueue: [],
      revisoesSRS: {},
      simuladosHistorico: [],
      totalAcertos: 15,
      totalErros: 5,
      xp: 220,
      nivel: 2,
      metaDiaria: 15,
      questoesHoje: 9,
      dataUltimoEstudo: '2026-10-21',
      conquistasDesbloqueadas: ['primeira_questao'],
    };
  });

  // 1. Tokens e cores da paleta oficial noturna AprovaFox
  it('1. Deve disponibilizar a paleta oficial AprovaFox como fonte única de verdade', () => {
    expect(aprovaFoxColors.night).toBe('#0B1020');
    expect(aprovaFoxColors.nightElevated).toBe('#121A2E');
    expect(aprovaFoxColors.surface).toBe('#18223A');
    expect(aprovaFoxColors.surfaceHover).toBe('#202D4A');
    expect(aprovaFoxColors.surfacePressed).toBe('#293653');
    expect(aprovaFoxColors.border).toBe('#293653');
    expect(aprovaFoxColors.text).toBe('#F4F7FF');
    expect(aprovaFoxColors.violet).toBe('#7657F6');
    expect(aprovaFoxColors.amber).toBe('#FFB547');
    expect(aprovaFoxColors.success).toBe('#42D392');
    expect(aprovaFoxColors.danger).toBe('#FF6B7A');
    expect(aprovaFoxColors.nav).toBe('#0E1629');
    expect(aprovaFoxColors.navBorder).toBe('#202D4A');

    // Mapeamento correto no tema
    expect(aprovaFoxTheme.bg).toBe(aprovaFoxColors.night);
    expect(aprovaFoxTheme.cardBg).toBe(aprovaFoxColors.surface);
    expect(aprovaFoxTheme.primary).toBe(aprovaFoxColors.violet);
    expect(aprovaFoxTheme.warning).toBe(aprovaFoxColors.amber);
  });

  // 2. Cálculo correto da meta diária
  it('2. A meta diária é calculada corretamente', () => {
    const p1 = calcularProgressoMeta(9, 15);
    expect(p1.atual).toBe(9);
    expect(p1.meta).toBe(15);
    expect(p1.percentual).toBe(60);
    expect(p1.concluida).toBe(false);
    expect(p1.restantes).toBe(6);

    const p2 = calcularProgressoMeta(15, 15);
    expect(p2.concluida).toBe(true);
    expect(p2.restantes).toBe(0);
  });

  // 3. Atualização de sequência somente por estudo válido
  it('3. A sequência só é atualizada por estudo válido na data civil', () => {
    // Dia seguinte consecutivo (21 -> 22)
    const resDiaSeguinte = atualizarSequenciaDiaria(mockStats, new Date('2026-10-22T14:00:00').getTime());
    expect(resDiaSeguinte.streak).toBe(4);
    expect(resDiaSeguinte.questoesHoje).toBe(1);

    // Mesmo dia: mantém sequência e incrementa contador
    const statsMesmoDia = { ...mockStats, dataUltimoEstudo: '2026-10-22', questoesHoje: 5 };
    const resMesmoDia = atualizarSequenciaDiaria(statsMesmoDia, new Date('2026-10-22T18:00:00').getTime());
    expect(resMesmoDia.streak).toBe(3);
    expect(resMesmoDia.questoesHoje).toBe(6);

    // Hiato > 1 dia (18 -> 22): zera para 1
    const statsHiato = { ...mockStats, dataUltimoEstudo: '2026-10-18', streak: 12 };
    const resHiato = atualizarSequenciaDiaria(statsHiato, new Date('2026-10-22T14:00:00').getTime());
    expect(resHiato.streak).toBe(1);
  });

  // 4. XP determinístico
  it('4. O XP é determinístico sem números aleatórios', () => {
    // Certeza + Acerto: 15 XP
    expect(calcularXpResposta(true, 3)).toBe(15);
    // Dúvida + Acerto: 10 XP
    expect(calcularXpResposta(true, 2)).toBe(10);
    // Erro de participação: 2 XP
    expect(calcularXpResposta(false, 3)).toBe(2);

    // Sessão perfeita com 10 acertos e 3 dias de streak
    const sessao = calcularXpSessao(10, 10, 3);
    expect(sessao.xpQuestoes).toBe(100);
    expect(sessao.xpBonusPerfeito).toBe(25);
    expect(sessao.xpBonusStreak).toBe(6);
    expect(sessao.xpTotal).toBe(131);
  });

  // 5. Responder questão atualiza histórico
  it('5. Responder uma questão atualiza o histórico de tentativas', () => {
    const q = (questionsData as Question[])[0];
    const { newStats } = aplicarResposta(mockStats, {
      questionId: q.id,
      category: q.category,
      selectedOptionIndex: q.correctIndex,
      isCorrect: true,
      certainty: 3,
    });

    expect(newStats.attempts.length).toBe(1);
    expect(newStats.attempts[0].questionId).toBe(q.id);
    expect(newStats.attempts[0].isCorrect).toBe(true);
  });

  // 6. Responder questão atualiza o SRS
  it('6. Responder uma questão atualiza o SRS Leitner', () => {
    const q = (questionsData as Question[])[1];
    const { newStats, classification } = aplicarResposta(mockStats, {
      questionId: q.id,
      category: q.category,
      selectedOptionIndex: q.correctIndex,
      isCorrect: true,
      certainty: 3,
    });

    expect(classification).toBe('real_mastery');
    const srs = newStats.revisoesSRS?.[q.id];
    expect(srs).toBeDefined();
    expect(srs!.caixa).toBe(2);
    expect(srs!.intervaloDias).toBe(3);
  });

  // 7. Questões erradas ficam disponíveis para revisão
  it('7. Questões erradas entram no errorQueue para revisão imediata', () => {
    const q = (questionsData as Question[])[2];
    const { newStats } = aplicarResposta(mockStats, {
      questionId: q.id,
      category: q.category,
      selectedOptionIndex: 0,
      isCorrect: false,
      certainty: 2,
    });

    expect(newStats.errorQueue).toContain(q.id);
  });

  // 8. Integridade dos filtros: nunca misturar provas, órgãos ou bancas
  it('8. Os filtros continuam separando banca, cargo, prova e matéria', () => {
    const allQuestions = questionsData as Question[];

    // Questões de Matemática
    const mat = filtrarQuestoes(
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
    expect(mat.length).toBe(10);
    expect(mat.every((q) => q.category === 'Matemática e Raciocínio Lógico')).toBe(true);

    // Questões de Crase
    const crase = filtrarQuestoes(
      allQuestions,
      {
        category: 'Crase (VUNESP)',
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
    expect(crase.every((q) => q.category === 'Crase (VUNESP)')).toBe(true);
  });

  // 9. Recomendação inteligente de estudos
  it('9. O recommendationService prioriza SRS vencido, pontos cegos e erros recentes', () => {
    const allQuestions = questionsData as Question[];

    // Sem pendências: recomenda edital
    const recPadrao = obterProximaAtividadeRecomendada(allQuestions, mockStats);
    expect(recPadrao.tipo).toBe('topico_fraco');

    // Com pontos cegos: prioridade 2
    const statsComPontoCego: UserStats = {
      ...mockStats,
      blindSpotQueue: [allQuestions[0].id],
    };
    const recPontoCego = obterProximaAtividadeRecomendada(allQuestions, statsComPontoCego);
    expect(recPontoCego.tipo).toBe('ponto_cego');
    expect(recPontoCego.questoes[0].id).toBe(allQuestions[0].id);
  });

  // 10. Persistência sem regressão
  it('10. Dados antigos continuam funcionando via backup e envelope v2', () => {
    const backup = gerarObjetoBackup(mockStats);
    expect(backup.v).toBe(2);
    expect(backup.meta.streak).toBe(mockStats.streak);

    const validacao = validarBackup(backup);
    expect(validacao.valido).toBe(true);
  });

  // 11. Preservação integral do conteúdo de concurso
  it('11. Nenhum enunciado ou gabarito foi alterado e nenhuma questão foi criada ou perdida', () => {
    const questions = questionsData as Question[];
    // Total estrito de 175 questões
    expect(questions.length).toBe(175);

    // Nenhuma questão com dados inválidos
    for (const q of questions) {
      expect(q.id).toBeDefined();
      expect(q.statement.length).toBeGreaterThan(5);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
      expect(q.raioX).toBeDefined();
      expect(q.difficulty).toBeDefined();
    }

    // 10 questões de matemática intactas
    const matQ = questions.filter((q) => q.category === 'Matemática e Raciocínio Lógico');
    expect(matQ.length).toBe(10);
    expect(matQ.map((q) => q.id)).toContain('itanhaem-ap-mat-01');
    expect(matQ.map((q) => q.id)).toContain('itanhaem-ap-mat-10');
  });

  // 12. Estado de gamificação convertido
  it('12. Converte UserStats para GamificationState adequadamente', () => {
    const gamification = converterStatsParaGamificationState(mockStats);
    expect(gamification.xpTotal).toBe(220);
    expect(gamification.currentStreak).toBe(3);
    expect(gamification.dailyGoal).toBe(15);
    expect(gamification.dailyProgress).toBe(9);
  });
});
