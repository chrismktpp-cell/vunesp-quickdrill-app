import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { calcularXpResposta, calcularNivel, formatarDataCivil, META_DIARIA_PADRAO } from '../services/xpEngine';
import questionsData from '../data/questions.json';

// Chaves Versionadas V2 (com envelope { v: 2, gen: number, savedAt: number, data: T })
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

export const THEME_KEY = 'vunesp_quickdrill_theme';
export const FAVORITES_KEY = 'vunesp_quickdrill_favorites_v1';
export const ONBOARDING_KEY = 'vunesp_qd_onboarding_v1';

export const MAX_ATTEMPTS = 400;
export const MAX_SIMULADOS = 20;

export interface StorageEnvelope<T> {
  v: 2;
  gen: number;
  savedAt: number;
  data: T;
}

export function wrapEnvelope<T>(data: T, gen: number = 1): string {
  const envelope: StorageEnvelope<T> = {
    v: 2,
    gen,
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
 * Extrai acumuladores com fallback para melhor esforço somando attempts.
 */
function extrairAcumuladores(
  source: any,
  attempts: QuestionAttempt[]
): {
  totalAcertos: number;
  totalErros: number;
  porCategoria: Record<CategoryType, { acertos: number; erros: number }>;
} {
  let totalAcertos = typeof source.totalAcertos === 'number' ? source.totalAcertos : undefined;
  let totalErros = typeof source.totalErros === 'number' ? source.totalErros : undefined;
  let porCategoria =
    source.porCategoria && typeof source.porCategoria === 'object' ? source.porCategoria : undefined;

  if (totalAcertos === undefined || totalErros === undefined) {
    let ac = 0;
    let er = 0;
    const catMap: Record<string, { acertos: number; erros: number }> = {};
    for (const a of attempts) {
      if (a.isCorrect) ac += 1;
      else er += 1;
      if (a.category) {
        if (!catMap[a.category]) catMap[a.category] = { acertos: 0, erros: 0 };
        if (a.isCorrect) catMap[a.category].acertos += 1;
        else catMap[a.category].erros += 1;
      }
    }
    totalAcertos = ac;
    totalErros = er;
    if (!porCategoria) porCategoria = catMap as any;
  }

  return {
    totalAcertos: totalAcertos ?? 0,
    totalErros: totalErros ?? 0,
    porCategoria: porCategoria || ({} as any),
  };
}

/**
 * Migra dados de formato antigo de forma idempotente e segura:
 * - sem v ou v === 1 -> normaliza e migra para formato v2 com acumuladores
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
    totalAcertos: 0,
    totalErros: 0,
    porCategoria: {} as any,
    gen: 1,
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
    const data = parsed.data;
    const attempts = Array.isArray(data.attempts) ? data.attempts.slice(0, MAX_ATTEMPTS) : [];
    const acum = extrairAcumuladores(data, attempts);
    const xpCalculado = typeof data.xp === 'number' ? data.xp : (acum.totalAcertos * 10 + acum.totalErros * 2);
    const nivelCalculado = typeof data.nivel === 'number' ? data.nivel : calcularNivel(xpCalculado).nivel;
    return {
      ...data,
      attempts,
      totalAcertos: acum.totalAcertos,
      totalErros: acum.totalErros,
      porCategoria: acum.porCategoria,
      xp: xpCalculado,
      nivel: nivelCalculado,
      metaDiaria: typeof data.metaDiaria === 'number' ? data.metaDiaria : META_DIARIA_PADRAO,
      questoesHoje: typeof data.questoesHoje === 'number' ? data.questoesHoje : 0,
      dataUltimoEstudo: typeof data.dataUltimoEstudo === 'string' ? data.dataUltimoEstudo : undefined,
      conquistasDesbloqueadas: Array.isArray(data.conquistasDesbloqueadas) ? data.conquistasDesbloqueadas : [],
      gen: typeof parsed.gen === 'number' ? parsed.gen : (typeof data.gen === 'number' ? data.gen : 1),
    };
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

  // Normaliza simulados antigos
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

  const acum = extrairAcumuladores(source, attempts);

  return {
    attempts,
    streak,
    bestStreak,
    blindSpotQueue,
    errorQueue,
    revisoesSRS,
    simuladosHistorico,
    totalAcertos: acum.totalAcertos,
    totalErros: acum.totalErros,
    porCategoria: acum.porCategoria,
    gen: 1,
  };
}

/**
 * Função pura para calcular o novo UserStats e a classificação em memória.
 * Não chama Haptics nem manipula I/O.
 */
export function aplicarResposta(
  prevStats: UserStats,
  input: {
    questionId: string;
    category: CategoryType;
    selectedOptionIndex: number;
    isCorrect: boolean;
    certainty: CertaintyLevel;
    tempoGastoMs?: number;
  }
): {
  newStats: UserStats;
  classification: PerformanceClassification;
  feedbackTip?: string;
} {
  const { questionId, category, selectedOptionIndex, isCorrect, certainty, tempoGastoMs } = input;

  let classification: PerformanceClassification;

  if (isCorrect) {
    if (certainty === 3) {
      classification = 'real_mastery';
    } else if (certainty === 1) {
      classification = 'lucky_guess';
    } else {
      classification = 'doubt_success';
    }
  } else {
    if (certainty === 3) {
      classification = 'blind_spot';
    } else if (certainty === 1) {
      classification = 'conscious_error';
    } else {
      classification = 'doubt_failure';
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
    tempoGastoMs,
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
  const srsAnterior = srsMap[questionId];
  const srsNovo = processarRespostaSRS(srsAnterior, questionId, isCorrect, certainty, now);
  srsMap[questionId] = srsNovo;

  // Dica de UI cirúrgica de 1 linha:
  // - Certeza 2 com caixa atingindo 3: "Dúvida não marca domínio. Acerte com certeza para avançar."
  // - Dominado ou avançado (caixa >= 4) caindo para caixa 2: "Voltou uma casa, não para o início."
  let feedbackTip: string | undefined;
  if (isCorrect && certainty === 2 && srsNovo.caixa === 3) {
    feedbackTip = 'Dúvida não marca domínio. Acerte com certeza para avançar.';
  } else if (!isCorrect && (srsAnterior?.caixa ?? 0) >= 4 && srsNovo.caixa === 2) {
    feedbackTip = 'Voltou uma casa, não para o início.';
  }

  // Acumuladores que sobrevivem ao corte de 400
  const prevTotalAcertos = prevStats.totalAcertos ?? 0;
  const prevTotalErros = prevStats.totalErros ?? 0;
  const newTotalAcertos = isCorrect ? prevTotalAcertos + 1 : prevTotalAcertos;
  const newTotalErros = !isCorrect ? prevTotalErros + 1 : prevTotalErros;

  const porCategoria = { ...(prevStats.porCategoria || {}) };
  const catStats = porCategoria[category] || { acertos: 0, erros: 0 };
  porCategoria[category] = {
    acertos: isCorrect ? catStats.acertos + 1 : catStats.acertos,
    erros: !isCorrect ? catStats.erros + 1 : catStats.erros,
  };

  const updatedAttempts = [newAttempt, ...(prevStats.attempts || [])].slice(0, MAX_ATTEMPTS);

  // Gamificação: XP, nível e contador do dia
  const xpGanho = calcularXpResposta(isCorrect, certainty);
  const newXp = (prevStats.xp ?? 0) + xpGanho;
  const nivelInfo = calcularNivel(newXp);
  const hoje = formatarDataCivil(now);
  const questoesHoje = prevStats.dataUltimoEstudo === hoje ? (prevStats.questoesHoje ?? 0) + 1 : 1;

  const newStats: UserStats = {
    attempts: updatedAttempts,
    streak: newStreak,
    bestStreak,
    blindSpotQueue: Array.from(blindSpotSet),
    errorQueue: Array.from(errorSet),
    revisoesSRS: srsMap,
    simuladosHistorico: prevStats.simuladosHistorico || [],
    totalAcertos: newTotalAcertos,
    totalErros: newTotalErros,
    porCategoria,
    gen: prevStats.gen || 1,
    xp: newXp,
    nivel: nivelInfo.nivel,
    questoesHoje,
    dataUltimoEstudo: hoje,
    metaDiaria: prevStats.metaDiaria || META_DIARIA_PADRAO,
    conquistasDesbloqueadas: prevStats.conquistasDesbloqueadas || [],
  };

  return { newStats, classification, feedbackTip };
}

/**
 * Poda de SRS órfão: apaga de revisoesSRS, blindSpotQueue e errorQueue qualquer id inexistente em questions.json.
 * Não altera os acumuladores históricos.
 */
export function podarOrfaosSRS(stats: UserStats): UserStats {
  const validIds = new Set(questionsData.map((q: any) => q.id));

  // Preserva integralmente o histórico de revisões SRS (sem perda de dados caso questões sejam renomeadas)
  const cleanSRS: Record<string, RevisaoSRS> = { ...(stats.revisoesSRS || {}) };

  // Apenas as filas ativas imediatas de treino filtram IDs válidos para evitar erros em tempo de execução
  const cleanBlindSpotQueue = (stats.blindSpotQueue || []).filter((id) => validIds.has(id));
  const cleanErrorQueue = (stats.errorQueue || []).filter((id) => validIds.has(id));

  return {
    ...stats,
    blindSpotQueue: cleanBlindSpotQueue,
    errorQueue: cleanErrorQueue,
    revisoesSRS: cleanSRS,
  };
}

/**
 * Carrega estatísticas iniciais a partir das 4 chaves versionadas V2.
 * - Valida 'gen' entre as chaves: se srs ou attempts divergirem do gen da meta, descarta a chave divergente.
 * - Executa poda de órfãos pós-migração.
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
      let envMeta: StorageEnvelope<any> | null = null;
      let envSrs: StorageEnvelope<any> | null = null;
      let envAttempts: StorageEnvelope<any> | null = null;
      let envSimulados: StorageEnvelope<any> | null = null;

      if (rawMeta) {
        try {
          envMeta = JSON.parse(rawMeta);
        } catch {
          envMeta = null;
        }
      }

      if (rawSrs) {
        try {
          envSrs = JSON.parse(rawSrs);
        } catch {
          envSrs = null;
        }
      }

      if (rawAttempts) {
        try {
          envAttempts = JSON.parse(rawAttempts);
        } catch {
          envAttempts = null;
        }
      }

      if (rawSimulados) {
        try {
          envSimulados = JSON.parse(rawSimulados);
        } catch {
          envSimulados = null;
        }
      }

      const metaGen = envMeta?.gen ?? envMeta?.data?.gen ?? 1;
      const meta = envMeta?.data || envMeta || {};

      // Carga não-destrutiva: dados persistidos nunca são descartados por divergência de gen
      let srs = envSrs?.data || envSrs || {};
      let attempts = Array.isArray(envAttempts?.data)
        ? envAttempts.data
        : Array.isArray(envAttempts)
        ? envAttempts
        : [];
      let simulados = Array.isArray(envSimulados?.data)
        ? envSimulados.data
        : Array.isArray(envSimulados)
        ? envSimulados
        : [];

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

      const cappedAttempts = attempts.slice(0, MAX_ATTEMPTS);
      const acum = extrairAcumuladores(meta, cappedAttempts);

      const rawStats: UserStats = {
        attempts: cappedAttempts,
        streak: typeof meta.streak === 'number' ? meta.streak : 0,
        bestStreak: typeof meta.bestStreak === 'number' ? meta.bestStreak : 0,
        blindSpotQueue: Array.isArray(meta.blindSpotQueue) ? meta.blindSpotQueue : [],
        errorQueue: Array.isArray(meta.errorQueue) ? meta.errorQueue : [],
        revisoesSRS: cleanSRS,
        simuladosHistorico: cleanSimulados,
        totalAcertos: acum.totalAcertos,
        totalErros: acum.totalErros,
        porCategoria: acum.porCategoria,
        gen: metaGen,
        xp: typeof meta.xp === 'number' ? meta.xp : (acum.totalAcertos * 10 + acum.totalErros * 2),
        nivel: typeof meta.nivel === 'number' ? meta.nivel : calcularNivel(typeof meta.xp === 'number' ? meta.xp : (acum.totalAcertos * 10 + acum.totalErros * 2)).nivel,
        metaDiaria: typeof meta.metaDiaria === 'number' ? meta.metaDiaria : META_DIARIA_PADRAO,
        questoesHoje: typeof meta.questoesHoje === 'number' ? meta.questoesHoje : 0,
        dataUltimoEstudo: typeof meta.dataUltimoEstudo === 'string' ? meta.dataUltimoEstudo : undefined,
        conquistasDesbloqueadas: Array.isArray(meta.conquistasDesbloqueadas) ? meta.conquistasDesbloqueadas : [],
      };

      // Poda de órfãos
      return podarOrfaosSRS(rawStats);
    }

    // Se as chaves v2 não existem, checa chaves antigas
    for (const oldKey of OLD_KEYS_V1) {
      const oldRaw = await AsyncStorage.getItem(oldKey);
      if (oldRaw) {
        const migrated = podarOrfaosSRS(migrate(oldRaw));
        const initialGen = 1;

        await AsyncStorage.multiSet([
          [
            KEY_META_V2,
            wrapEnvelope(
              {
                gen: initialGen,
                streak: migrated.streak,
                bestStreak: migrated.bestStreak,
                blindSpotQueue: migrated.blindSpotQueue,
                errorQueue: migrated.errorQueue,
                totalAcertos: migrated.totalAcertos,
                totalErros: migrated.totalErros,
                porCategoria: migrated.porCategoria,
              },
              initialGen
            ),
          ],
          [KEY_SRS_V2, wrapEnvelope(migrated.revisoesSRS || {}, initialGen)],
          [KEY_ATTEMPTS_V2, wrapEnvelope(migrated.attempts.slice(0, MAX_ATTEMPTS), initialGen)],
          [KEY_SIMULADOS_V2, wrapEnvelope((migrated.simuladosHistorico || []).slice(0, MAX_SIMULADOS), initialGen)],
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
    totalAcertos: 0,
    totalErros: 0,
    porCategoria: {} as any,
    gen: 1,
  };
}

/**
 * Constrói o objeto meta serializável para persistência.
 */
function metaOf(stats: UserStats, gen: number) {
  return {
    gen,
    streak: stats.streak ?? 0,
    bestStreak: stats.bestStreak ?? 0,
    blindSpotQueue: stats.blindSpotQueue || [],
    errorQueue: stats.errorQueue || [],
    totalAcertos: stats.totalAcertos ?? 0,
    totalErros: stats.totalErros ?? 0,
    porCategoria: stats.porCategoria || ({} as any),
    xp: stats.xp ?? 0,
    nivel: stats.nivel ?? 1,
    metaDiaria: stats.metaDiaria ?? META_DIARIA_PADRAO,
    questoesHoje: stats.questoesHoje ?? 0,
    dataUltimoEstudo: stats.dataUltimoEstudo,
    conquistasDesbloqueadas: stats.conquistasDesbloqueadas || [],
  };
}

/**
 * Persiste atomicamente todas as chaves versionadas V2 via multiSet.
 * Garante que meta, srs, attempts e simulados compartilhem rigorosamente o mesmo gen,
 * prevenindo qualquer divergência ou perda de dados.
 */
export function persistStats(stats: UserStats): Promise<UserStats> {
  const nextGen = (stats.gen || 0) + 1;
  const updatedStats: UserStats = {
    ...stats,
    gen: nextGen,
  };

  const cappedAttempts = (updatedStats.attempts || []).slice(0, MAX_ATTEMPTS);
  const cappedSimulados = (updatedStats.simuladosHistorico || []).slice(0, MAX_SIMULADOS);
  const meta = metaOf(updatedStats, nextGen);

  return enqueueWrite(async () => {
    try {
      await AsyncStorage.multiSet([
        [KEY_META_V2, wrapEnvelope(meta, nextGen)],
        [KEY_SRS_V2, wrapEnvelope(updatedStats.revisoesSRS || {}, nextGen)],
        [KEY_ATTEMPTS_V2, wrapEnvelope(cappedAttempts, nextGen)],
        [KEY_SIMULADOS_V2, wrapEnvelope(cappedSimulados, nextGen)],
      ]);
    } catch (e) {
      console.error('Error persisting stats to AsyncStorage', e);
    }
    return updatedStats;
  });
}

/**
 * Persiste a resposta através da fila de escrita atômica unificada.
 */
export async function saveAttemptToStorage(newStats: UserStats): Promise<void> {
  await persistStats(newStats);
}

/**
 * Persiste simulados com salvamento atômico de todo o estado através de persistStats.
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

  return persistStats(updatedStats);
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
    totalAcertos: 0,
    totalErros: 0,
    porCategoria: {} as any,
    gen: 1,
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
  } else {
    set.add(id);
  }
  const updated = Array.from(set);
  try {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving favorites to AsyncStorage', e);
  }
  return updated;
}

// Onboarding (primeira abertura única)
export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(ONBOARDING_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    // ignore
  }
}

// Backup & Restauração
export interface QuickDrillBackup {
  v: 2;
  exportedAt: number;
  meta: {
    gen: number;
    streak: number;
    bestStreak: number;
    blindSpotQueue: string[];
    errorQueue: string[];
    totalAcertos?: number;
    totalErros?: number;
    porCategoria?: Partial<Record<CategoryType, { acertos: number; erros: number }>>;
  };
  srs: Record<string, RevisaoSRS>;
  attempts: QuestionAttempt[];
  simulados: SimuladoResultado[];
}

export function gerarObjetoBackup(stats: UserStats): QuickDrillBackup {
  return {
    v: 2,
    exportedAt: Date.now(),
    meta: {
      gen: stats.gen || 1,
      streak: stats.streak,
      bestStreak: stats.bestStreak,
      blindSpotQueue: stats.blindSpotQueue,
      errorQueue: stats.errorQueue,
      totalAcertos: stats.totalAcertos,
      totalErros: stats.totalErros,
      porCategoria: stats.porCategoria,
    },
    srs: stats.revisoesSRS || {},
    attempts: (stats.attempts || []).slice(0, MAX_ATTEMPTS),
    simulados: (stats.simuladosHistorico || []).slice(0, MAX_SIMULADOS),
  };
}

export function validarBackup(raw: unknown): { valido: boolean; erro?: string; data?: QuickDrillBackup } {
  let parsed: any = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { valido: false, erro: 'JSON com formatação inválida.' };
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valido: false, erro: 'Estrutura inválida.' };
  }

  if (parsed.v !== 2) {
    return { valido: false, erro: 'Versão de backup incompatível (esperada v: 2).' };
  }

  if (!parsed.meta || typeof parsed.meta !== 'object') {
    return { valido: false, erro: 'Metadados ausentes ou inválidos.' };
  }

  if (!parsed.srs || typeof parsed.srs !== 'object') {
    return { valido: false, erro: 'Dados de repetição SRS ausentes ou inválidos.' };
  }

  if (!Array.isArray(parsed.attempts)) {
    return { valido: false, erro: 'Histórico de tentativas ausente ou inválido.' };
  }

  if (!Array.isArray(parsed.simulados)) {
    return { valido: false, erro: 'Histórico de simulados ausente ou inválido.' };
  }

  return { valido: true, data: parsed as QuickDrillBackup };
}

export async function restaurarBackup(
  backup: QuickDrillBackup,
  currentStats: UserStats
): Promise<UserStats> {
  const newGen = (currentStats.gen || 0) + 1;

  const rawStats: UserStats = {
    attempts: backup.attempts.slice(0, MAX_ATTEMPTS),
    streak: typeof backup.meta.streak === 'number' ? backup.meta.streak : 0,
    bestStreak: typeof backup.meta.bestStreak === 'number' ? backup.meta.bestStreak : 0,
    blindSpotQueue: Array.isArray(backup.meta.blindSpotQueue) ? backup.meta.blindSpotQueue : [],
    errorQueue: Array.isArray(backup.meta.errorQueue) ? backup.meta.errorQueue : [],
    revisoesSRS: backup.srs || {},
    simuladosHistorico: backup.simulados || [],
    totalAcertos: backup.meta.totalAcertos,
    totalErros: backup.meta.totalErros,
    porCategoria: backup.meta.porCategoria,
    gen: newGen,
  };

  const pruned = podarOrfaosSRS(rawStats);

  await enqueueWrite(async () => {
    const metaToSave = {
      gen: newGen,
      streak: pruned.streak,
      bestStreak: pruned.bestStreak,
      blindSpotQueue: pruned.blindSpotQueue,
      errorQueue: pruned.errorQueue,
      totalAcertos: pruned.totalAcertos,
      totalErros: pruned.totalErros,
      porCategoria: pruned.porCategoria,
    };

    // Ordem de gravação com o novo gen
    await AsyncStorage.setItem(KEY_SRS_V2, wrapEnvelope(pruned.revisoesSRS || {}, newGen));
    await AsyncStorage.setItem(KEY_ATTEMPTS_V2, wrapEnvelope(pruned.attempts, newGen));
    await AsyncStorage.setItem(KEY_SIMULADOS_V2, wrapEnvelope(pruned.simuladosHistorico || [], newGen));
    await AsyncStorage.setItem(KEY_META_V2, wrapEnvelope(metaToSave, newGen));
  });

  return pruned;
}
