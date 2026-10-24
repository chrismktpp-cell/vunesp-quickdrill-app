import type { Question, UserStats, TrilhaDiaProgresso } from '../types/schema';
import { PLANO_7_DIAS, DiaRoteiro } from '../data/planoEstudosRoteiro';

export interface StatusDiaTrilha {
  dia: number;
  status: 'travado' | 'aberto' | 'concluido';
  concluido: boolean;
  questoesRespondidas: number;
  questoesAcertos: number;
  notaPercentual: number;
  estrelas: number; // 0 a 3 estrelas
}

export interface StatusTrilhaGeral {
  diaAtual: number;
  diasConcluidos: number;
  totalDias: number;
  percentualCiclo: number;
  dias: StatusDiaTrilha[];
}

/**
 * Retorna os dados do roteiro de um dia específico (1 a 7).
 */
export function obterDiaRoteiro(dia: number): DiaRoteiro | undefined {
  return PLANO_7_DIAS.find((d) => d.dia === dia);
}

/**
 * Filtra e seleciona de forma balanceada as questões para a missão do dia da Trilha.
 */
export function filtrarQuestoesDoDia(
  todasQuestoes: Question[],
  diaRoteiro: DiaRoteiro
): Question[] {
  // 1. Filtra por categorias do dia
  const elegiveis = todasQuestoes.filter((q) =>
    diaRoteiro.filtroCategorias.includes(q.category)
  );

  if (elegiveis.length === 0) return [];

  // 2. Se houver subtópicos prioritários, separa em alta prioridade e complementares
  let prioridade: Question[] = [];
  let outras: Question[] = [];

  if (diaRoteiro.subtopicosFoco && diaRoteiro.subtopicosFoco.length > 0) {
    const termos = diaRoteiro.subtopicosFoco.map((t) => t.toLowerCase());
    for (const q of elegiveis) {
      const sub = (q.subtopic || '').toLowerCase();
      const match = termos.some((t) => sub.includes(t));
      if (match) {
        prioridade.push(q);
      } else {
        outras.push(q);
      }
    }
  } else {
    prioridade = [...elegiveis];
  }

  // Embaralha para evitar repetição mecânica
  const shuffle = <T>(arr: T[]): T[] => {
    const copia = [...arr];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  };

  const pool = [...shuffle(prioridade), ...shuffle(outras)];

  // Retorna a quantidade exata da meta do dia
  return pool.slice(0, diaRoteiro.metaQuestoes);
}

/**
 * Calcula o status de desbloqueio e progresso de cada um dos 7 dias do ciclo.
 */
export function calcularStatusTrilha(stats: UserStats): StatusTrilhaGeral {
  const trilhaDias = stats.trilhaDias || {};
  const diaAtual = stats.diaAtualTrilha || 1;

  let concluidosCount = 0;

  const diasStatus: StatusDiaTrilha[] = PLANO_7_DIAS.map((roteiro, idx) => {
    const reg = trilhaDias[roteiro.dia];
    const concluido = !!reg?.concluido;
    if (concluido) concluidosCount++;

    const acertos = reg?.questoesAcertos || 0;
    const respondidas = reg?.questoesRespondidas || 0;
    const nota = reg?.notaPercentual || (respondidas > 0 ? Math.round((acertos / respondidas) * 100) : 0);

    let estrelas = 0;
    if (concluido) {
      if (nota >= 90) estrelas = 3;
      else if (nota >= 70) estrelas = 2;
      else estrelas = 1;
    }

    // Regra de destravamento progressivo:
    // O Dia 1 está sempre aberto.
    // O Dia N está aberto se for <= diaAtual ou se o Dia N-1 foi concluído.
    let status: 'travado' | 'aberto' | 'concluido' = 'travado';
    if (concluido) {
      status = 'concluido';
    } else if (roteiro.dia === 1 || roteiro.dia <= diaAtual || !!trilhaDias[roteiro.dia - 1]?.concluido) {
      status = 'aberto';
    } else {
      status = 'travado';
    }

    return {
      dia: roteiro.dia,
      status,
      concluido,
      questoesRespondidas: respondidas,
      questoesAcertos: acertos,
      notaPercentual: nota,
      estrelas,
    };
  });

  const totalDias = PLANO_7_DIAS.length;
  const percentualCiclo = Math.round((concluidosCount / totalDias) * 100);

  return {
    diaAtual,
    diasConcluidos: concluidosCount,
    totalDias,
    percentualCiclo,
    dias: diasStatus,
  };
}

/**
 * Atualiza o progresso do usuário ao concluir a missão de um dia da trilha.
 */
export function registrarConclusaoDiaTrilha(
  stats: UserStats,
  dia: number,
  attempts: number,
  correct: number
): UserStats {
  const notaPercentual = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
  const now = new Date().toISOString();

  const trilhaAtual = { ...(stats.trilhaDias || {}) };
  const diaAnterior = trilhaAtual[dia];

  // Se já concluiu com nota superior, mantém a melhor nota
  const melhorNota = Math.max(notaPercentual, diaAnterior?.notaPercentual || 0);
  const melhorAcertos = Math.max(correct, diaAnterior?.questoesAcertos || 0);

  trilhaAtual[dia] = {
    dia,
    concluido: true,
    questoesRespondidas: attempts,
    questoesAcertos: melhorAcertos,
    notaPercentual: melhorNota,
    dataConclusao: now,
  };

  // Se o dia concluído for o dia atual, destrava o próximo (até o dia 7)
  const diaAtual = stats.diaAtualTrilha || 1;
  const proximoDia = dia >= diaAtual ? Math.min(7, dia + 1) : diaAtual;

  // Bônus de XP pela conclusão do dia da trilha (+50 XP por dia, +100 XP no boss)
  const bonusXp = dia === 7 ? 100 : 50;

  return {
    ...stats,
    trilhaDias: trilhaAtual,
    diaAtualTrilha: proximoDia,
    xp: (stats.xp || 0) + bonusXp,
  };
}

