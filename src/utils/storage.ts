import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import type {
  UserStats,
  QuestionAttempt,
  PerformanceClassification,
  CertaintyLevel,
  CategoryType,
  RevisaoSRS,
  SimuladoResultado,
} from '../types';
import { processarRespostaSRS } from '../services/srsEngine';

// Chaves de armazenamento divididas para performance e granularidade
export const OLD_STORAGE_KEY = 'vunesp_quickdrill_stats_v1';
export const KEY_META = 'vunesp_qd_meta_v1';
export const KEY_SRS = 'vunesp_qd_srs_v1';
export const KEY_ATTEMPTS = 'vunesp_qd_attempts_v1';
export const KEY_SIMULADOS = 'vunesp_qd_simulados_v1';

const THEME_KEY = 'vunesp_quickdrill_theme';
const FAVORITES_KEY = 'vunesp_quickdrill_favorites_v1';

const MAX_ATTEMPTS = 400;
const MAX_SIMULADOS = 20;

/**
 * Função pura para calcular o novo UserStats e a classificação de desempenho em memória.
 * Mantém um teto de 400 tentativas recentes sem afetar o histórico consolidado do SRS.
 */
export function aplicarResposta(
  prevStats: UserStats,
  input: {
    questionId: string;
    category: CategoryType;
    selectedOptionIndex: number;
    isCorrect: boolean;
    certainty: CertaintyLevel;
  }
): { newStats: UserStats; classification: PerformanceClassification } {
  const { questionId, category, selectedOptionIndex, isCorrect, certainty } = input;

  let classification: PerformanceClassification;

  if (isCorrect) {
    if (certainty === 3) {
      classification = 'real_mastery'; // Certeza + Acerto -> Domínio Real!
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else if (certainty === 1) {
      classification = 'lucky_guess'; // Chute + Acerto -> Sorte
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      classification = 'doubt_success'; // Dúvida + Acerto
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  } else {
    if (certainty === 3) {
      classification = 'blind_spot'; // Certeza + Erro -> PONTO CEGO CRÍTICO!
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } else if (certainty === 1) {
      classification = 'conscious_error';
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      classification = 'doubt_failure';
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  }

  const now = Date.now();
  const newAttempt: QuestionAttempt = {
    id: `att-${now}-${Math.random().toString(36).substr(2, 5)}`,
    questionId,
    category,
    selectedOptionIndex,
    isCorrect,
    certainty,
    classification,
    timestamp: now,
  };

  const newStreak = isCorrect ? prevStats.streak + 1 : 0;
  const bestStreak = Math.max(prevStats.bestStreak, newStreak);

  // Atualiza fila de pontos cegos
  const blindSpotSet = new Set(prevStats.blindSpotQueue);
  if (classification === 'blind_spot') {
    blindSpotSet.add(questionId);
  } else if (isCorrect && certainty === 3) {
    blindSpotSet.delete(questionId);
  }

  // Atualiza fila de erros
  const errorSet = new Set(prevStats.errorQueue);
  if (!isCorrect) {
    errorSet.add(questionId);
  } else if (isCorrect && certainty >= 2) {
    errorSet.delete(questionId);
  }

  // Atualiza Repetição Espaçada (SRS SM-2 / Leitner)
  const srsMap = { ...(prevStats.revisoesSRS || {}) };
  const srsAtual = srsMap[questionId];
  srsMap[questionId] = processarRespostaSRS(srsAtual, questionId, isCorrect, certainty, now);

  // Teto de 400 tentativas mais recentes (inseridas no início)
  const updatedAttempts = [newAttempt, ...(prevStats.attempts || [])].slice(0, MAX_ATTEMPTS);

  const newStats: UserStats = {
    attempts: updatedAttempts,
    streak: newStreak,
    bestStreak,
    blindSpotQueue: Array.from(blindSpotSet),
    errorQueue: Array.from(errorSet),
    revisoesSRS: srsMap,
    simuladosHistorico: prevStats.simuladosHistorico || [],
  };

  return { newStats, classification };
}

/**
 * Carrega estatísticas iniciais a partir das 4 chaves separadas.
 * Se houver chave antiga única (v1), executa migração automática uma vez e apaga a antiga.
 */
export async function loadInitialStats(): Promise<UserStats> {
  try {
    const keys = [KEY_META, KEY_SRS, KEY_ATTEMPTS, KEY_SIMULADOS];
    const pairs = await AsyncStorage.multiGet(keys);
    const map = new Map<string, string | null>(pairs);

    const rawMeta = map.get(KEY_META);
    const rawSrs = map.get(KEY_SRS);
    const rawAttempts = map.get(KEY_ATTEMPTS);
    const rawSimulados = map.get(KEY_SIMULADOS);

    if (rawMeta || rawSrs || rawAttempts || rawSimulados) {
      const meta = rawMeta ? JSON.parse(rawMeta) : {};
      const srs = rawSrs ? JSON.parse(rawSrs) : {};
      const attempts = rawAttempts ? JSON.parse(rawAttempts) : [];
      const simulados = rawSimulados ? JSON.parse(rawSimulados) : [];

      // Sanitiza simulados antigos que possam ainda ter o objeto pergunta inteiro
      const simuladosNormalizados = (Array.isArray(simulados) ? simulados : []).map((sim: any) => ({
        ...sim,
        respostas: Array.isArray(sim.respostas)
          ? sim.respostas.map((r: any) => ({
              perguntaId: r.perguntaId || r.pergunta?.id,
              selectedOptionIndex: r.selectedOptionIndex ?? null,
              isCorrect: !!r.isCorrect,
            }))
          : [],
      }));

      return {
        attempts: Array.isArray(attempts) ? attempts.slice(0, MAX_ATTEMPTS) : [],
        streak: typeof meta.streak === 'number' ? meta.streak : 0,
        bestStreak: typeof meta.bestStreak === 'number' ? meta.bestStreak : 0,
        blindSpotQueue: Array.isArray(meta.blindSpotQueue) ? meta.blindSpotQueue : [],
        errorQueue: Array.isArray(meta.errorQueue) ? meta.errorQueue : [],
        revisoesSRS: srs || {},
        simuladosHistorico: simuladosNormalizados.slice(0, MAX_SIMULADOS),
      };
    }

    // Caso de migração: chave única legada
    const oldRaw = await AsyncStorage.getItem(OLD_STORAGE_KEY);
    if (oldRaw) {
      const parsed = JSON.parse(oldRaw);
      const attempts = (Array.isArray(parsed.attempts) ? parsed.attempts : []).slice(0, MAX_ATTEMPTS);
      const revisoesSRS = parsed.revisoesSRS || {};
      const streak = typeof parsed.streak === 'number' ? parsed.streak : 0;
      const bestStreak = typeof parsed.bestStreak === 'number' ? parsed.bestStreak : 0;
      const blindSpotQueue = Array.isArray(parsed.blindSpotQueue) ? parsed.blindSpotQueue : [];
      const errorQueue = Array.isArray(parsed.errorQueue) ? parsed.errorQueue : [];

      const rawSimulados = Array.isArray(parsed.simuladosHistorico) ? parsed.simuladosHistorico : [];
      const simuladosNormalizados = rawSimulados.slice(0, MAX_SIMULADOS).map((sim: any) => ({
        ...sim,
        respostas: Array.isArray(sim.respostas)
          ? sim.respostas.map((r: any) => ({
              perguntaId: r.perguntaId || r.pergunta?.id,
              selectedOptionIndex: r.selectedOptionIndex ?? null,
              isCorrect: !!r.isCorrect,
            }))
          : [],
      }));

      const meta = { streak, bestStreak, blindSpotQueue, errorQueue };

      // Grava nas quatro novas chaves e remove a legada
      await AsyncStorage.multiSet([
        [KEY_META, JSON.stringify(meta)],
        [KEY_SRS, JSON.stringify(revisoesSRS)],
        [KEY_ATTEMPTS, JSON.stringify(attempts)],
        [KEY_SIMULADOS, JSON.stringify(simuladosNormalizados)],
      ]);
      await AsyncStorage.removeItem(OLD_STORAGE_KEY);

      return {
        attempts,
        streak,
        bestStreak,
        blindSpotQueue,
        errorQueue,
        revisoesSRS,
        simuladosHistorico: simuladosNormalizados,
      };
    }
  } catch (e) {
    console.error('Error loading stats from AsyncStorage', e);
  }

  return {
    attempts: [],
    streak: 0,
    bestStreak: 0,
    blindSpotQueue: [],
    errorQueue: [],
    revisoesSRS: {},
    simuladosHistorico: [],
  };
}

/**
 * Grava apenas as chaves de resposta (meta, srs, attempts) usando multiSet.
 * Não regrava histórico de simulados.
 */
export async function saveAttemptToStorage(newStats: UserStats): Promise<void> {
  try {
    const meta = {
      streak: newStats.streak,
      bestStreak: newStats.bestStreak,
      blindSpotQueue: newStats.blindSpotQueue,
      errorQueue: newStats.errorQueue,
    };

    await AsyncStorage.multiSet([
      [KEY_META, JSON.stringify(meta)],
      [KEY_SRS, JSON.stringify(newStats.revisoesSRS || {})],
      [KEY_ATTEMPTS, JSON.stringify((newStats.attempts || []).slice(0, MAX_ATTEMPTS))],
    ]);
  } catch (e) {
    console.error('Error saving attempt to AsyncStorage', e);
  }
}

/**
 * Salva apenas a chave de simulados (KEY_SIMULADOS), sem tocar em attempts/meta/srs.
 * Mantém no máximo 20 resultados leves (sem o objeto Question duplicado).
 */
export async function saveSimuladoToStorage(
  prevStats: UserStats,
  resultado: SimuladoResultado
): Promise<UserStats> {
  const normalizado: SimuladoResultado = {
    ...resultado,
    respostas: (resultado.respostas || []).map((r) => ({
      perguntaId: r.perguntaId || (r as any).pergunta?.id,
      selectedOptionIndex: r.selectedOptionIndex,
      isCorrect: r.isCorrect,
    })),
  };

  const historico = [normalizado, ...(prevStats.simuladosHistorico || [])].slice(0, MAX_SIMULADOS);
  const updatedStats: UserStats = {
    ...prevStats,
    simuladosHistorico: historico,
  };

  try {
    await AsyncStorage.setItem(KEY_SIMULADOS, JSON.stringify(historico));
  } catch (e) {
    console.error('Error saving simulado to AsyncStorage', e);
  }

  return updatedStats;
}

export async function clearUserStats(): Promise<UserStats> {
  const reset: UserStats = {
    attempts: [],
    streak: 0,
    bestStreak: 0,
    blindSpotQueue: [],
    errorQueue: [],
    revisoesSRS: {},
    simuladosHistorico: [],
  };
  try {
    await AsyncStorage.multiRemove([
      OLD_STORAGE_KEY,
      KEY_META,
      KEY_SRS,
      KEY_ATTEMPTS,
      KEY_SIMULADOS,
    ]);
  } catch (e) {
    console.error('Error clearing storage', e);
  }
  return reset;
}

export async function loadStoredTheme(): Promise<'light' | 'dark'> {
  try {
    const saved = await AsyncStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // fallback
  }
  return 'dark';
}

export async function saveStoredTheme(theme: 'light' | 'dark'): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
}

// Favorites for Flashcard / Macetes
export async function loadFavoriteIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error loading favorites from AsyncStorage', e);
  }
  return [];
}

export async function toggleFavoriteId(id: string, currentFavorites: string[]): Promise<string[]> {
  const set = new Set(currentFavorites);
  if (set.has(id)) {
    set.delete(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } else {
    set.add(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
  const updated = Array.from(set);
  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving favorites to AsyncStorage', e);
  }
  return updated;
}

export function triggerLightHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
