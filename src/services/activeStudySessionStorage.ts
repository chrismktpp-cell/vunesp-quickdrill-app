import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Question } from '../types/schema';

export const KEY_ACTIVE_STUDY_SESSION = '@vunesp:active_study_session:v1';

export interface ActiveStudySessionData {
  v: 1;
  title: string;
  questions: Question[];
  currentIndex: number;
  attempts: number;
  correct: number;
  xpGained: number;
  errorTopics: Record<string, number>;
  sourceQuestions: Question[];
  diaTrilha?: number;
  savedAt: number;
}

/**
 * Salva o estado de uma sessão de estudo ativa (Trilha ou Treino) com debounce e versionamento.
 */
export async function salvarSessaoEstudoAtiva(data: {
  title: string;
  questions: Question[];
  currentIndex: number;
  attempts: number;
  correct: number;
  xpGained: number;
  errorTopics: Record<string, number>;
  sourceQuestions: Question[];
  diaTrilha?: number;
}): Promise<void> {
  try {
    const payload: ActiveStudySessionData = {
      ...data,
      v: 1,
      savedAt: Date.now(),
    };
    await AsyncStorage.setItem(KEY_ACTIVE_STUDY_SESSION, JSON.stringify(payload));
  } catch (err) {
    console.warn('Erro ao salvar sessão de estudo ativa:', err);
  }
}

/**
 * Carrega a sessão de estudo ativa de forma defensiva, descartando dados corrompidos.
 */
export async function carregarSessaoEstudoAtiva(): Promise<ActiveStudySessionData | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_ACTIVE_STUDY_SESSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.v === 1 &&
      typeof parsed.title === 'string' &&
      Array.isArray(parsed.questions) &&
      parsed.questions.length > 0 &&
      typeof parsed.currentIndex === 'number' &&
      typeof parsed.attempts === 'number' &&
      typeof parsed.correct === 'number'
    ) {
      return parsed as ActiveStudySessionData;
    }
    return null;
  } catch (err) {
    console.warn('Erro ao carregar sessão de estudo ativa:', err);
    return null;
  }
}

/**
 * Limpa o rascunho da sessão de estudo após conclusão ou descarte explícito.
 */
export async function limparSessaoEstudoAtiva(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY_ACTIVE_STUDY_SESSION);
  } catch (err) {
    console.warn('Erro ao limpar sessão de estudo ativa:', err);
  }
}

