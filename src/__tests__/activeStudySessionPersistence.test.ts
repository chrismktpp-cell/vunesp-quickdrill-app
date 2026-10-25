import { describe, expect, it, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  KEY_ACTIVE_STUDY_SESSION,
  salvarSessaoEstudoAtiva,
  carregarSessaoEstudoAtiva,
  limparSessaoEstudoAtiva,
} from '../services/activeStudySessionStorage';
import type { Question } from '../types/schema';

let mockStore: Record<string, string> = {};

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStore[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStore[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStore[key];
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      mockStore = {};
      return Promise.resolve();
    }),
  },
}));

describe('ActiveStudySessionStorage - Persistência Resiliente de Treinos e Trilha', () => {
  const mockQuestions: Question[] = [
    {
      id: 'q-trilha-1',
      category: 'Crase (VUNESP)',
      subtopic: 'Casos Proibidos',
      statement: 'Assinale a alternativa correta sobre crase.',
      options: ['a', 'b', 'c', 'd', 'e'],
      correctIndex: 0,
      raioX: 'Explicação detalhada',
      difficulty: 'Média',
      banca: 'VUNESP',
      materia: 'Língua Portuguesa',
    },
  ];

  beforeEach(async () => {
    mockStore = {};
    await AsyncStorage.clear();
  });

  it('1. salva e recupera com sucesso o progresso de uma sessão ativa da Trilha', async () => {
    await salvarSessaoEstudoAtiva({
      title: 'Dia 1: Concordância Verbal',
      questions: mockQuestions,
      currentIndex: 3,
      attempts: 3,
      correct: 2,
      xpGained: 30,
      errorTopics: { 'Concordância Verbal': 1 },
      sourceQuestions: mockQuestions,
      diaTrilha: 1,
    });

    const session = await carregarSessaoEstudoAtiva();
    expect(session).not.toBeNull();
    expect(session?.v).toBe(1);
    expect(session?.title).toBe('Dia 1: Concordância Verbal');
    expect(session?.currentIndex).toBe(3);
    expect(session?.attempts).toBe(3);
    expect(session?.correct).toBe(2);
    expect(session?.diaTrilha).toBe(1);
    expect(session?.errorTopics['Concordância Verbal']).toBe(1);
  });

  it('2. limparSessaoEstudoAtiva remove o rascunho persistido após conclusão', async () => {
    await salvarSessaoEstudoAtiva({
      title: 'Treino Rápido',
      questions: mockQuestions,
      currentIndex: 1,
      attempts: 1,
      correct: 1,
      xpGained: 10,
      errorTopics: {},
      sourceQuestions: mockQuestions,
    });

    await limparSessaoEstudoAtiva();
    const loaded = await carregarSessaoEstudoAtiva();
    expect(loaded).toBeNull();
  });

  it('3. descarta defensivamente dados corrompidos ou com formato inválido', async () => {
    await AsyncStorage.setItem(KEY_ACTIVE_STUDY_SESSION, '{"v": 2, "dado_antigo": true}');
    const loadedV2 = await carregarSessaoEstudoAtiva();
    expect(loadedV2).toBeNull();

    await AsyncStorage.setItem(KEY_ACTIVE_STUDY_SESSION, 'INVALID_JSON_CORROMPIDO{[');
    const loadedCorrupted = await carregarSessaoEstudoAtiva();
    expect(loadedCorrupted).toBeNull();
  });
});

