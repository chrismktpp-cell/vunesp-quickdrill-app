import { describe, it, expect, vi, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  aplicarResposta,
  loadInitialStats,
  saveAttemptToStorage,
  saveSimuladoToStorage,
  OLD_STORAGE_KEY,
  KEY_META,
  KEY_SRS,
  KEY_ATTEMPTS,
  KEY_SIMULADOS,
} from '../utils/storage';
import type { UserStats, SimuladoResultado } from '../types/schema';

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
    multiGet: vi.fn((keys: string[]) =>
      Promise.resolve(keys.map((k) => [k, mockStore[k] ?? null]))
    ),
    multiSet: vi.fn((pairs: [string, string][]) => {
      for (const [k, v] of pairs) mockStore[k] = v;
      return Promise.resolve();
    }),
    multiRemove: vi.fn((keys: string[]) => {
      for (const k of keys) delete mockStore[k];
      return Promise.resolve();
    }),
  },
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn().mockResolvedValue(undefined),
  impactAsync: vi.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

describe('Storage & Performance Optimizations', () => {
  const initialStats: UserStats = {
    attempts: [],
    streak: 0,
    bestStreak: 0,
    blindSpotQueue: [],
    errorQueue: [],
    revisoesSRS: {},
    simuladosHistorico: [],
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('aplicarResposta (função pura em memória)', () => {
    it('deve calcular resposta correta com certeza como real_mastery e incrementar streak', () => {
      const { newStats, classification } = aplicarResposta(initialStats, {
        questionId: 'q-1',
        category: 'Crase (VUNESP)',
        selectedOptionIndex: 0,
        isCorrect: true,
        certainty: 3,
      });

      expect(classification).toBe('real_mastery');
      expect(newStats.streak).toBe(1);
      expect(newStats.bestStreak).toBe(1);
      expect(newStats.attempts.length).toBe(1);
      expect(newStats.attempts[0].questionId).toBe('q-1');
      expect(newStats.revisoesSRS?.['q-1']).toBeDefined();
    });

    it('deve adicionar a blindSpotQueue se errar com certeza (blind_spot)', () => {
      const { newStats, classification } = aplicarResposta(initialStats, {
        questionId: 'q-2',
        category: 'Sujeito Oracional e Transitividade',
        selectedOptionIndex: 1,
        isCorrect: false,
        certainty: 3,
      });

      expect(classification).toBe('blind_spot');
      expect(newStats.streak).toBe(0);
      expect(newStats.blindSpotQueue).toContain('q-2');
      expect(newStats.errorQueue).toContain('q-2');
    });

    it('deve limitar attempts ao teto de 400 tentativas mais recentes', () => {
      let stats = initialStats;
      // Adiciona 410 tentativas
      for (let i = 0; i < 410; i++) {
        const { newStats } = aplicarResposta(stats, {
          questionId: `q-${i}`,
          category: 'Crase (VUNESP)',
          selectedOptionIndex: 0,
          isCorrect: true,
          certainty: 3,
        });
        stats = newStats;
      }

      expect(stats.attempts.length).toBe(400);
      // A tentativa mais recente (q-409) deve ser a primeira
      expect(stats.attempts[0].questionId).toBe('q-409');
    });
  });

  describe('Migração de chaves e persistência separada', () => {
    it('deve migrar da chave antiga única para as 4 chaves separadas', () => {
      // Setup mock de armazenamento com chave antiga
      const mockOldData = {
        streak: 5,
        bestStreak: 10,
        blindSpotQueue: ['q-blind'],
        errorQueue: ['q-err'],
        attempts: [
          {
            questionId: 'q-old',
            category: 'Crase (VUNESP)',
            selectedOptionIndex: 0,
            isCorrect: true,
            certainty: 3,
            classification: 'real_mastery',
            timestamp: 123456,
          },
        ],
        revisoesSRS: {
          'q-old': {
            perguntaId: 'q-old',
            caixa: 2,
            intervaloDias: 3,
            proximaRevisao: 999999,
            historicoRepeticoes: 1,
            fatorFacilidade: 2.5,
            lapses: 0,
            status: 'em_revisao',
            ultimaRevisao: 123456,
          },
        },
        simuladosHistorico: [
          {
            id: 'sim-old',
            titulo: 'Simulado Antigo',
            dataHora: 1000,
            tempoTotalGastoSegundos: 300,
            duracaoTotalSegundos: 900,
            totalQuestoes: 1,
            acertos: 1,
            erros: 0,
            emBranco: 0,
            pontuacaoPercentual: 100,
            detalhesPorCategoria: {},
            respostas: [
              {
                pergunta: { id: 'q-old', statement: 'Statement antigo duplicado' },
                selectedOptionIndex: 0,
                isCorrect: true,
              },
            ],
          },
        ],
      };

      mockStore[OLD_STORAGE_KEY] = JSON.stringify(mockOldData);

      return loadInitialStats().then((loaded) => {
        expect(loaded.streak).toBe(5);
        expect(loaded.bestStreak).toBe(10);
        expect(loaded.blindSpotQueue).toEqual(['q-blind']);
        expect(loaded.revisoesSRS?.['q-old'].caixa).toBe(2);
        // Simulado deve ter descartado objeto 'pergunta' e mantido 'perguntaId'
        expect(loaded.simuladosHistorico?.[0].respostas[0].perguntaId).toBe('q-old');
        expect((loaded.simuladosHistorico?.[0].respostas[0] as any).pergunta).toBeUndefined();

        // Deve ter gravado nas 4 chaves novas e removido a chave antiga
        expect(mockStore[OLD_STORAGE_KEY]).toBeUndefined();
        expect(mockStore[KEY_META]).toBeDefined();
        expect(mockStore[KEY_SRS]).toBeDefined();
        expect(mockStore[KEY_ATTEMPTS]).toBeDefined();
        expect(mockStore[KEY_SIMULADOS]).toBeDefined();
      });
    });
  });
});
