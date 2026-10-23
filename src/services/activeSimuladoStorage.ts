import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Question, SimuladoConfig, SimuladoResposta } from '../types/schema';

export const KEY_ACTIVE_SIMULADO = '@vunesp:active_simulado:v1';

export interface ActiveSimuladoData {
  v: 1;
  config: SimuladoConfig;
  questions: Question[];
  currentIndex: number;
  respostas: Record<string, SimuladoResposta>;
  startedAt: number;
  totalDurationSeconds: number;
  savedAt: number;
}

/**
 * Salva o estado de um simulado em andamento com versionamento e integridade.
 */
export async function salvarSimuladoAtivo(data: {
  config: SimuladoConfig;
  questions: Question[];
  currentIndex: number;
  respostas: Record<string, SimuladoResposta>;
  startedAt: number;
  totalDurationSeconds: number;
}): Promise<void> {
  try {
    const payload: ActiveSimuladoData = {
      ...data,
      v: 1,
      savedAt: Date.now(),
    };
    await AsyncStorage.setItem(KEY_ACTIVE_SIMULADO, JSON.stringify(payload));
  } catch (err) {
    console.warn('Erro ao salvar simulado em andamento:', err);
  }
}

/**
 * Carrega o simulado em andamento de forma segura e defensiva.
 */
export async function carregarSimuladoAtivo(): Promise<ActiveSimuladoData | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_ACTIVE_SIMULADO);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.v === 1 &&
      Array.isArray(parsed.questions) &&
      typeof parsed.startedAt === 'number' &&
      typeof parsed.totalDurationSeconds === 'number'
    ) {
      return parsed as ActiveSimuladoData;
    }
    return null;
  } catch (err) {
    console.warn('Erro ao carregar simulado em andamento:', err);
    return null;
  }
}

/**
 * Limpa o simulado em andamento após conclusão ou descarte.
 */
export async function limparSimuladoAtivo(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY_ACTIVE_SIMULADO);
  } catch (err) {
    console.warn('Erro ao limpar simulado em andamento:', err);
  }
}
