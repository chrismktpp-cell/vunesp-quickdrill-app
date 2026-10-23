import { describe, expect, it } from 'vitest';
import {
  calcularXpResposta,
  calcularXpSessao,
  calcularNivel,
  calcularProgressoMeta,
  atualizarSequenciaDiaria,
  avaliarConquistas,
  formatarDataCivil,
} from '../services/xpEngine';
import type { UserStats } from '../types/schema';

describe('xpEngine - Gamificação e Progressão do Concurseiro', () => {
  it('calcula XP por resposta individual com bônus de certeza', () => {
    // Acerto com Certeza (3)
    expect(calcularXpResposta(true, 3)).toBe(15);
    // Acerto com Dúvida (2)
    expect(calcularXpResposta(true, 2)).toBe(10);
    // Acerto com Chute (1)
    expect(calcularXpResposta(true, 1)).toBe(10);
    // Erro (esforço/participação)
    expect(calcularXpResposta(false, 3)).toBe(2);
    expect(calcularXpResposta(false, 1)).toBe(2);
  });

  it('calcula XP de sessão com bônus por sessão perfeita e bônus de sequência', () => {
    // 5 de 5 corretas com streak 4
    const resPerfeita = calcularXpSessao(5, 5, 4);
    // 5 * 10 = 50 + bônus perfeito (25) + bônus streak (4 * 2 = 8) = 83
    expect(resPerfeita.xpBonusPerfeito).toBe(25);
    expect(resPerfeita.xpBonusStreak).toBe(8);
    expect(resPerfeita.xpTotal).toBe(83);

    // 5 de 10 corretas com streak 0
    const resMista = calcularXpSessao(10, 5, 0);
    // 5 * 10 + 5 * 2 = 60 + 0 + 0 = 60
    expect(resMista.xpBonusPerfeito).toBe(0);
    expect(resMista.xpTotal).toBe(60);
  });

  it('calcula níveis de progressão e títulos corretamente', () => {
    // Nível 1: Aspirante
    const n1 = calcularNivel(50);
    expect(n1.nivel).toBe(1);
    expect(n1.titulo).toBe('Aspirante a Concurso');
    expect(n1.progressoPercentual).toBe(50);

    // Nível 2: Concurseiro Focado
    const n2 = calcularNivel(100);
    expect(n2.nivel).toBe(2);
    expect(n2.titulo).toBe('Concurseiro Focado');

    // Nível 5: Aprovável (900+ XP)
    const n5 = calcularNivel(950);
    expect(n5.nivel).toBe(5);
    expect(n5.titulo).toBe('Aprovável');
  });

  it('calcula progresso da meta diária', () => {
    const p1 = calcularProgressoMeta(5, 15);
    expect(p1.atual).toBe(5);
    expect(p1.meta).toBe(15);
    expect(p1.percentual).toBe(33);
    expect(p1.concluida).toBe(false);
    expect(p1.restantes).toBe(10);

    const p2 = calcularProgressoMeta(15, 15);
    expect(p2.concluida).toBe(true);
    expect(p2.percentual).toBe(100);
    expect(p2.restantes).toBe(0);
  });

  it('gerencia sequência diária mantendo apenas quando houver estudo consecutivo', () => {
    const stats: UserStats = {
      attempts: [],
      streak: 3,
      bestStreak: 5,
      blindSpotQueue: [],
      errorQueue: [],
    };

    // Primeiro estudo do dia 2026-10-20
    const t1 = new Date('2026-10-20T10:00:00Z').getTime();
    const res1 = atualizarSequenciaDiaria(stats, t1);
    expect(res1.streak).toBe(1);
    expect(res1.questoesHoje).toBe(1);
    expect(res1.dataUltimoEstudo).toBe('2026-10-20');

    // Segundo estudo no mesmo dia
    const t2 = new Date('2026-10-20T15:00:00Z').getTime();
    const statsMesmoDia: UserStats = {
      ...stats,
      streak: 1,
      questoesHoje: 1,
      dataUltimoEstudo: '2026-10-20',
    };
    const res2 = atualizarSequenciaDiaria(statsMesmoDia, t2);
    expect(res2.streak).toBe(1);
    expect(res2.questoesHoje).toBe(2);

    // Estudo no dia seguinte consecutivo (2026-10-21) -> streak avança!
    const t3 = new Date('2026-10-21T10:00:00Z').getTime();
    const res3 = atualizarSequenciaDiaria(statsMesmoDia, t3);
    expect(res3.streak).toBe(2);
    expect(res3.questoesHoje).toBe(1);
    expect(res3.dataUltimoEstudo).toBe('2026-10-21');
  });

  it('avalia desbloqueio de conquistas reais', () => {
    const stats: UserStats = {
      attempts: [],
      streak: 3,
      bestStreak: 3,
      blindSpotQueue: [],
      errorQueue: [],
      totalAcertos: 15,
      totalErros: 5,
      questoesHoje: 15,
      metaDiaria: 15,
    };

    const conquistas = avaliarConquistas(stats);
    const primeiroPasso = conquistas.find((c) => c.id === 'primeiro_passo');
    expect(primeiroPasso?.desbloqueada).toBe(true);

    const metaDiaria = conquistas.find((c) => c.id === 'meta_diaria');
    expect(metaDiaria?.desbloqueada).toBe(true);

    const fogo3 = conquistas.find((c) => c.id === 'fogo_3dias');
    expect(fogo3?.desbloqueada).toBe(true);
  });
});

