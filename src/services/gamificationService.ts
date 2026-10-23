/**
 * AprovaFox Gamification Service
 * Lógica determinística de XP, níveis, meta diária, sequências e conquistas.
 */

import type { UserStats, CertaintyLevel, Conquista, CategoryType } from '../types/schema';
import {
  calcularXpResposta,
  calcularXpSessao,
  calcularNivel,
  calcularProgressoMeta,
  atualizarSequenciaDiaria,
  avaliarConquistas,
  formatarDataCivil,
  InfoNivel,
  XP_ACERTO,
  XP_BONUS_CERTEZA,
  XP_PARTICIPACAO_ERRO,
  XP_BONUS_SESSAO_PERFEITA,
  META_DIARIA_PADRAO,
} from './xpEngine';

export interface GamificationState {
  xpTotal: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate?: string;
  dailyGoal: number;
  dailyProgress: number;
  achievements: string[];
}

export function converterStatsParaGamificationState(stats: UserStats): GamificationState {
  return {
    xpTotal: stats.xp || 0,
    currentStreak: stats.streak || 0,
    longestStreak: stats.bestStreak || 0,
    lastStudyDate: stats.dataUltimoEstudo,
    dailyGoal: stats.metaDiaria || META_DIARIA_PADRAO,
    dailyProgress: stats.questoesHoje || 0,
    achievements: stats.conquistasDesbloqueadas || [],
  };
}

export {
  calcularXpResposta,
  calcularXpSessao,
  calcularNivel,
  calcularProgressoMeta,
  atualizarSequenciaDiaria,
  avaliarConquistas,
  formatarDataCivil,
  InfoNivel,
  XP_ACERTO,
  XP_BONUS_CERTEZA,
  XP_PARTICIPACAO_ERRO,
  XP_BONUS_SESSAO_PERFEITA,
  META_DIARIA_PADRAO,
};

