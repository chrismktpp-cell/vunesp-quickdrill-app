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
} from '../types/schema';
import { processarRespostaSRS } from '../services/srsEngine';

// Chaves Versionadas V2 (com envelope { v: 2, savedAt: number, data: T })
export const KEY_META_V2 = 'vunesp_qd_meta_v2';
export const KEY_SRS_V2 = 'vunesp_qd_srs_v2';
export const KEY_ATTEMPTS_V2 = 'vunesp_qd_attempts_v2';
export const KEY_SIMULADOS_V2 = 'vunesp_qd_simulados_v2';

export const OLD_STORAGE_KEY_V1 = 'vunesp_quickdrill_stats_v1';
export const OLD_KEYS_V1 = [
  'vunesp_quickdrill_stats_v1',
  'vunesp_qd_meta_v1',
  'vunesp_qd_srs_v1',
  'vunesp_qd_attempts_v1',
  'vunesp_qd_simulados_v1',
];

const THEME_KEY = 'vunesp_quickdrill_theme';
const FAVORITES_KEY = 'vunesp_quickdrill_favorites_v1';

const MAX_ATTEMPTS = 400;
const MAX_SIMULADOS = 20;

export interface StorageEnvelope<T> {
  v: 2;
  savedAt: number;
  data: T;
}

export function wrapEnvelope<T>(data: T): string {
  const envelope: StorageEnvelope<T> = {
    v: 2,
    savedAt: Date.now(),
    data,
  };
  return JSON.stringify(envelope);
}

// Mutex de fila de escrita (Promise Chain) para garantir persistência ordenada
let writeQueue: Promise<unknown> = Promise.resolve();

export function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => {});
  return next;
}

/**
 * Migra dados de formato antigo de forma idempotente e segura:
 * - sem v ou v === 1 -> normaliza e migra para formato v2
 * - v === 2 -> devolve
 * - JSON inválido -> devolve stats vazios, sem quebrar o app
 */
export function migrate(raw: unknown): UserStats {
  const emptyStats: UserStats = {
    attempts: [],
    streak: 0,
    bestStreak: 0,
    blindSpotQueue: [],
    errorQueue: [],
    revisoesSRS: {},
    simuladosHistorico: [],
  };

  if (!raw) return emptyStats;

  let parsed: any = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('JSON inválido no storage, recuperando com stats vazios');
      return emptyStats;
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return emptyStats;
  }

  // Se já for envelope v === 2
  if (parsed.v === 2 && parsed.data && typeof parsed.data === 'object') {
    return parsed.data as UserStats;
  }

  // Se for v === 1 ou sem v (blob antigo)
  const source = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;

  const rawAttempts = Array.isArray(source.attempts) ? source.attempts : [];
  const attempts = rawAttempts.slice(0, MAX_ATTEMPTS);

  const streak = typeof source.streak === 'number' ? source.streak : 0;
  const bestStreak = typeof source.bestStreak === 'number' ? source.bestStreak : 0;
  const blindSpotQueue = Array.isArray(source.blindSpotQueue) ? source.blindSpotQueue : [];
  const errorQueue = Array.isArray(source.errorQueue) ? source.errorQueue : [];

  // Remove fatorFacilidade de itens antigos do SRS
  const revisoesSRS: Record<string, RevisaoSRS> = {};
  if (source.revisoesSRS && typeof source.revisoesSRS === 'object') {
    for (const [k, v] of Object.entries(source.revisoesSRS)) {
      if (v && typeof v === 'object') {
        const { fatorFacilidade, ...rest } = v as any;
        revisoesSRS[k] = rest as RevisaoSRS;
      }
    }
  }

  // Normaliza simulados antigos: descarta objeto pergunta inteiro, mantendo perguntaId
  const rawSimulados = Array.isArray(source.simuladosHistorico) ? source.simuladosHistorico : [];
  const simuladosHistorico: SimuladoResultado[] = rawSimulados.slice(0, MAX_SIMULADOS).map((sim: any) => ({
    ...sim,
    respostas: Array.isArray(sim.respostas)
      ? sim.respostas.map((r: any) => ({
          perguntaId: r.perguntaId || r.pergunta?.id || '',
          selectedOptionIndex: r.selectedOptionIndex !== undefined ? r.selectedOptionIndex : null,
          isCorrect: !!r.isCorrect,
        }))
      : [],
  }));

  return {
    attempts,
    streak,
    bestStreak,
    blindSpotQueue,
    errorQueue,
    revisoesSRS,
    simuladosHistorico,
  };
}

/**
 * Função pura para calcular o novo UserStats e a classificação em memória.
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
      classification = 'real_mastery';
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else if (certainty === 1) {
      classification = 'lucky_guess';
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      classification = 'doubt_success';
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  } else {
    if (certainty === 3) {
      classification = 'blind_spot';
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

  // Atualiza filas
  const blindSpotSet = new Set(prevStats.blindSpotQueue);
  if (classification === 'blind_spot') {
    blindSpotSet.add(questionId);
  } else if (isCorrect && certainty === 3) {
    blindSpotSet.delete(questionId);
  }

  const errorSet = new Set(prevStats.errorQueue);
  if (!isCorrect) {
    errorSet.add(questionId);
  } else if (isCorrect && certainty >= 2) {
    errorSet.delete(questionId);
  }

  // Atualiza SRS
  const srsMap = { ...(prevStats.revisoesSRS || {}) };
  const srsAtual = srsMap[questionId];
  srsMap[questionId] = processarRespostaSRS(srsAtual, questionId, isCorrect, certainty, now);

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
 * Carrega estatísticas iniciais a partir das 4 chaves versionadas V2.
 * Caso não existam, verifica a chave legada V1, migra os dados e remove as chaves antigas.
 */
export async function loadInitialStats(): Promise<UserStats> {
  try {
    const keys = [KEY_META_V2, KEY_SRS_V2, KEY_ATTEMPTS_V2, KEY_SIMULADOS_V2];
    const pairs = await AsyncStorage.multiGet(keys);
    const map = new Map<string, string | null>(pairs);

    const rawMeta = map.get(KEY_META_V2);
    const rawSrs = map.get(KEY_SRS_V2);
    const rawAttempts = map.get(KEY_ATTEMPTS_V2);
    const rawSimulados = map.get(KEY_SIMULADOS_V2);

    if (rawMeta || rawSrs || rawAttempts || rawSimulados) {
      let meta: any = {};
      let srs: any = {};
      let attempts: any[] = [];
      let simulados: any[] = [];

      if (rawMeta) {
        try {
          const parsed = JSON.parse(rawMeta);
          meta = parsed?.data || parsed || {};
        } catch {
          meta = {};
        }
      }

      if (rawSrs) {
        try {
          const parsed = JSON.parse(rawSrs);
          srs = parsed?.data || parsed || {};
        } catch {
          srs = {};
        }
      }

      if (rawAttempts) {
        try {
          const parsed = JSON.parse(rawAttempts);
          attempts = Array.isArray(parsed?.data) ? parsed.data : (Array.isArray(parsed) ? parsed : []);
        } catch {
          attempts = [];
        }
      }

      if (rawSimulados) {
        try {
          const parsed = JSON.parse(rawSimulados);
          simulados = Array.isArray(parsed?.data) ? parsed.data : (Array.isArray(parsed) ? parsed : []);
        } catch {
          simulados = [];
        }
      }

      const cleanSRS: Record<string, RevisaoSRS> = {};
      if (srs && typeof srs === 'object') {
        for (const [k, v] of Object.entries(srs)) {
          if (v && typeof v === 'object') {
            const { fatorFacilidade, ...rest } = v as any;
            cleanSRS[k] = rest as RevisaoSRS;
          }
        }
      }

      const cleanSimulados = simulados.slice(0, MAX_SIMULADOS).map((sim: any) => ({
        ...sim,
        respostas: Array.isArray(sim.respostas)
          ? sim.respostas.map((r: any) => ({
              perguntaId: r.perguntaId || r.pergunta?.id || '',
              selectedOptionIndex: r.selectedOptionIndex !== undefined ? r.selectedOptionIndex : null,
              isCorrect: !!r.isCorrect,
            }))
          : [],
      }));

      return {
        attempts: attempts.slice(0, MAX_ATTEMPTS),
        streak: typeof meta.streak === 'number' ? meta.streak : 0,
        bestStreak: typeof meta.bestStreak === 'number' ? meta.bestStreak : 0,
        blindSpotQueue: Array.isArray(meta.blindSpotQueue) ? meta.blindSpotQueue : [],
        errorQueue: Array.isArray(meta.errorQueue) ? meta.errorQueue : [],
        revisoesSRS: cleanSRS,
        simuladosHistorico: cleanSimulados,
      };
    }

    // Se as chaves v2 não existem, checa chaves antigas
    for (const oldKey of OLD_KEYS_V1) {
      const oldRaw = await AsyncStorage.getItem(oldKey);
      if (oldRaw) {
        const migrated = migrate(oldRaw);

        await AsyncStorage.multiSet([
          [
            KEY_META_V2,
            wrapEnvelope({
              streak: migrated.streak,
              bestStreak: migrated.bestStreak,
              blindSpotQueue: migrated.blindSpotQueue,
              errorQueue: migrated.errorQueue,
            }),
          ],
          [KEY_SRS_V2, wrapEnvelope(migrated.revisoesSRS || {})],
          [KEY_ATTEMPTS_V2, wrapEnvelope(migrated.attempts.slice(0, MAX_ATTEMPTS))],
          [KEY_SIMULADOS_V2, wrapEnvelope((migrated.simuladosHistorico || []).slice(0, MAX_SIMULADOS))],
        ]);

        await AsyncStorage.multiRemove(OLD_KEYS_V1).catch(() => {});

        return migrated;
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

/**
 * Persiste a resposta através da fila de escrita em ordem sequencial.
 * Grava apenas as chaves meta + srs + attempts com o teto de 400 tentativas.
 */
export function saveAttemptToStorage(newStats: UserStats): Promise<void> {
  return enqueueWrite(async () => {
    try {
      const meta = {
        streak: newStats.streak,
        bestStreak: newStats.bestStreak,
        blindSpotQueue: newStats.blindSpotQueue,
        errorQueue: newStats.errorQueue,
      };

      const cappedAttempts = (newStats.attempts || []).slice(0, MAX_ATTEMPTS);

      await AsyncStorage.multiSet([
        [KEY_META_V2, wrapEnvelope(meta)],
        [KEY_SRS_V2, wrapEnvelope(newStats.revisoesSRS || {})],
        [KEY_ATTEMPTS_V2, wrapEnvelope(cappedAttempts)],
      ]);
    } catch (e) {
      console.error('Error saving attempt to AsyncStorage', e);
    }
  });
}

/**
 * Persiste apenas a chave de simulados na fila de escrita, sem tocar em meta/srs/attempts.
 * Aplica o teto de 20 simulados no formato leve (sem Question embutida).
 */
export function saveSimuladoToStorage(
  prevStats: UserStats,
  resultado: SimuladoResultado
): Promise<UserStats> {
  const normalizado: SimuladoResultado = {
    ...resultado,
    respostas: (resultado.respostas || []).map((r) => ({
      perguntaId: r.perguntaId || (r as any).pergunta?.id || '',
      selectedOptionIndex: r.selectedOptionIndex !== undefined ? r.selectedOptionIndex : null,
      isCorrect: !!r.isCorrect,
    })),
  };

  const historico = [normalizado, ...(prevStats.simuladosHistorico || [])].slice(0, MAX_SIMULADOS);
  const updatedStats: UserStats = {
    ...prevStats,
    simuladosHistorico: historico,
  };

  enqueueWrite(async () => {
    try {
      await AsyncStorage.setItem(KEY_SIMULADOS_V2, wrapEnvelope(historico));
    } catch (e) {
      console.error('Error saving simulado to AsyncStorage', e);
    }
  });

  return Promise.resolve(updatedStats);
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
      KEY_META_V2,
      KEY_SRS_V2,
      KEY_ATTEMPTS_V2,
      KEY_SIMULADOS_V2,
      ...OLD_KEYS_V1,
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
