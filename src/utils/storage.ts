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

const STORAGE_KEY = 'vunesp_quickdrill_stats_v1';
const THEME_KEY = 'vunesp_quickdrill_theme';
const FAVORITES_KEY = 'vunesp_quickdrill_favorites_v1';

export async function loadInitialStats(): Promise<UserStats> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.attempts)) {
        return {
          ...parsed,
          revisoesSRS: parsed.revisoesSRS || {},
          simuladosHistorico: parsed.simuladosHistorico || [],
        };
      }
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

export async function saveAttemptToStorage(
  prevStats: UserStats,
  questionId: string,
  category: CategoryType,
  selectedOptionIndex: number,
  isCorrect: boolean,
  certainty: CertaintyLevel
): Promise<{ newStats: UserStats; classification: PerformanceClassification }> {
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

  // Update blind spot queue
  const blindSpotSet = new Set(prevStats.blindSpotQueue);
  if (classification === 'blind_spot') {
    blindSpotSet.add(questionId);
  } else if (isCorrect && certainty === 3) {
    blindSpotSet.delete(questionId);
  }

  // Update error queue
  const errorSet = new Set(prevStats.errorQueue);
  if (!isCorrect) {
    errorSet.add(questionId);
  } else if (isCorrect && certainty >= 2) {
    errorSet.delete(questionId);
  }

  // Update Spaced Repetition (SRS SM-2 / Leitner)
  const srsMap = { ...(prevStats.revisoesSRS || {}) };
  const srsAtual = srsMap[questionId];
  srsMap[questionId] = processarRespostaSRS(srsAtual, questionId, isCorrect, certainty, now);

  const updatedStats: UserStats = {
    attempts: [newAttempt, ...prevStats.attempts],
    streak: newStreak,
    bestStreak,
    blindSpotQueue: Array.from(blindSpotSet),
    errorQueue: Array.from(errorSet),
    revisoesSRS: srsMap,
    simuladosHistorico: prevStats.simuladosHistorico || [],
  };

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStats));
  } catch (e) {
    console.error('Error saving stats to AsyncStorage', e);
  }

  return { newStats: updatedStats, classification };
}

export async function saveSimuladoToStorage(
  prevStats: UserStats,
  resultado: SimuladoResultado
): Promise<UserStats> {
  const historico = [resultado, ...(prevStats.simuladosHistorico || [])];
  const updatedStats: UserStats = {
    ...prevStats,
    simuladosHistorico: historico,
  };

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStats));
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
    await AsyncStorage.removeItem(STORAGE_KEY);
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
