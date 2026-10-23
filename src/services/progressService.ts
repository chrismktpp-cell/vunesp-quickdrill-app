import type {
  Question,
  UserStats,
  QuestionAttempt,
  CategoryType,
  RevisaoSRS,
} from '../types/schema';
import editalPadrao from '../data/edital.json';

export interface MateriaProgresso {
  materia: string;
  totalQuestoes: number;
  respondidas: number;
  acertos: number;
  erros: number;
  taxaAcerto: number;
  dominadas: number;
  emRevisao: number;
  pendentes: number;
}

export interface ProgressOverviewData {
  totalQuestoesBanco: number;
  totalRespondidas: number;
  totalAcertos: number;
  totalErros: number;
  taxaAproveitamento: number;
  streakAtual: number;
  melhorStreak: number;
  xpTotal: number;
  revisoesPendentes: number;
  pontosCegosCount: number;
  simuladosCount: number;
  progressoPorMateria: Record<string, MateriaProgresso>;
}

/**
 * Calcula visão geral e determinística do progresso do candidato no concurso
 */
export function calcularProgressoGeral(
  questions: Question[],
  stats: UserStats
): ProgressOverviewData {
  const attempts = stats.attempts || [];
  const revisoesSRS = stats.revisoesSRS || {};
  const blindSpotQueue = stats.blindSpotQueue || [];
  const simulados = stats.simuladosHistorico || [];

  const totalQuestoesBanco = questions.length;
  const totalRespondidas = attempts.length;
  const totalAcertos = attempts.filter((a) => a.isCorrect).length;
  const totalErros = totalRespondidas - totalAcertos;
  const taxaAproveitamento =
    totalRespondidas > 0 ? Math.round((totalAcertos / totalRespondidas) * 100) : 0;

  // Agrupamento por matéria real
  const mapMaterias: Record<string, { total: number; respondidas: Set<string>; acertos: number; erros: number; dominadas: number; emRevisao: number; pendentes: number }> = {};

  for (const q of questions) {
    const mat = q.category || 'Geral';
    if (!mapMaterias[mat]) {
      mapMaterias[mat] = {
        total: 0,
        respondidas: new Set(),
        acertos: 0,
        erros: 0,
        dominadas: 0,
        emRevisao: 0,
        pendentes: 0,
      };
    }
    mapMaterias[mat].total += 1;

    const srs = revisoesSRS[q.id];
    if (srs) {
      if (srs.status === 'dominado' || srs.caixa >= 5) {
        mapMaterias[mat].dominadas += 1;
      } else if (srs.status === 'em_revisao' || srs.caixa > 1) {
        mapMaterias[mat].emRevisao += 1;
      } else {
        mapMaterias[mat].pendentes += 1;
      }
    } else {
      mapMaterias[mat].pendentes += 1;
    }
  }

  for (const att of attempts) {
    if (mapMaterias[att.category]) {
      mapMaterias[att.category].respondidas.add(att.questionId);
      if (att.isCorrect) {
        mapMaterias[att.category].acertos += 1;
      } else {
        mapMaterias[att.category].erros += 1;
      }
    }
  }

  const progressoPorMateria: Record<string, MateriaProgresso> = {};
  for (const [materia, dados] of Object.entries(mapMaterias)) {
    const respCount = dados.respondidas.size;
    const taxa =
      dados.acertos + dados.erros > 0
        ? Math.round((dados.acertos / (dados.acertos + dados.erros)) * 100)
        : 0;

    progressoPorMateria[materia] = {
      materia,
      totalQuestoes: dados.total,
      respondidas: respCount,
      acertos: dados.acertos,
      erros: dados.erros,
      taxaAcerto: taxa,
      dominadas: dados.dominadas,
      emRevisao: dados.emRevisao,
      pendentes: dados.pendentes,
    };
  }

  // Conta revisões pendentes no SRS
  const agora = Date.now();
  let revisoesPendentes = 0;
  for (const srs of Object.values(revisoesSRS)) {
    if (srs && srs.proximaRevisao && srs.proximaRevisao <= agora) {
      revisoesPendentes += 1;
    }
  }

  return {
    totalQuestoesBanco,
    totalRespondidas,
    totalAcertos,
    totalErros,
    taxaAproveitamento,
    streakAtual: stats.streak || 0,
    melhorStreak: stats.bestStreak || 0,
    xpTotal: stats.xp || 0,
    revisoesPendentes,
    pontosCegosCount: blindSpotQueue.length,
    simuladosCount: simulados.length,
    progressoPorMateria,
  };
}

