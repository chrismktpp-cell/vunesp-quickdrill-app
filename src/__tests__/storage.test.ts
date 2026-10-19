import { describe, it, expect, vi, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  aplicarResposta,
  loadInitialStats,
  saveAttemptToStorage,
  saveSimuladoToStorage,
  migrate,
  wrapEnvelope,
  OLD_STORAGE_KEY_V1,
  KEY_META_V2,
  KEY_SRS_V2,
  KEY_ATTEMPTS_V2,
  KEY_SIMULADOS_V2,
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

describe('Storage & Performance Optimizations (V2 Envelope & Mutex)', () => {
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
    mockStore = {};
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
      expect(stats.attempts[0].questionId).toBe('q-409');
    });
  });

  describe('migrate (idempotência e segurança)', () => {
    it('deve retornar stats vazios para JSON inválido sem derrubar o app', () => {
      const res = migrate('{"invalido:');
      expect(res.attempts).toEqual([]);
      expect(res.streak).toBe(0);
    });

    it('deve devolver dados intactos se já for envelope v === 2', () => {
      const v2Envelope = {
        v: 2,
        savedAt: 1234567,
        data: {
          attempts: [],
          streak: 7,
          bestStreak: 12,
          blindSpotQueue: ['q-1'],
          errorQueue: [],
          revisoesSRS: {},
          simuladosHistorico: [],
        },
      };

      const res = migrate(JSON.stringify(v2Envelope));
      expect(res.streak).toBe(7);
      expect(res.bestStreak).toBe(12);
      expect(res.blindSpotQueue).toEqual(['q-1']);
    });

    it('deve migrar blob v1 antigo descartando objeto pergunta de simulados e removendo fatorFacilidade', () => {
      const oldBlob = {
        streak: 3,
        bestStreak: 6,
        blindSpotQueue: ['q-blind'],
        errorQueue: ['q-err'],
        attempts: [{ questionId: 'q-old', isCorrect: true, timestamp: 100 }],
        revisoesSRS: {
          'q-old': {
            perguntaId: 'q-old',
            caixa: 2,
            intervaloDias: 3,
            proximaRevisao: 200,
            historicoRepeticoes: 1,
            fatorFacilidade: 2.5,
            lapses: 0,
            status: 'em_revisao',
            ultimaRevisao: 100,
          },
        },
        simuladosHistorico: [
          {
            id: 'sim-1',
            titulo: 'Simulado V1',
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

      const res = migrate(oldBlob);
      expect(res.streak).toBe(3);
      expect(res.revisoesSRS?.['q-old'].caixa).toBe(2);
      expect((res.revisoesSRS?.['q-old'] as any).fatorFacilidade).toBeUndefined();
      expect(res.simuladosHistorico?.[0].respostas[0].perguntaId).toBe('q-old');
      expect((res.simuladosHistorico?.[0].respostas[0] as any).pergunta).toBeUndefined();
    });
  });

  describe('Persistência V2 e Mutex', () => {
    it('deve gravar tentativas encapsuladas em envelopes V2 sem tocar na chave de simulados', async () => {
      const statsToSave: UserStats = {
        attempts: [
          {
            questionId: 'q-save',
            category: 'Crase (VUNESP)',
            selectedOptionIndex: 0,
            isCorrect: true,
            certainty: 3,
            classification: 'real_mastery',
            timestamp: 1234,
          },
        ],
        streak: 2,
        bestStreak: 4,
        blindSpotQueue: [],
        errorQueue: [],
        revisoesSRS: {},
        simuladosHistorico: [],
      };

      await saveAttemptToStorage(statsToSave);

      expect(mockStore[KEY_META_V2]).toBeDefined();
      expect(mockStore[KEY_SRS_V2]).toBeDefined();
      expect(mockStore[KEY_ATTEMPTS_V2]).toBeDefined();
      expect(mockStore[KEY_SIMULADOS_V2]).toBeUndefined();

      const parsedMeta = JSON.parse(mockStore[KEY_META_V2]);
      expect(parsedMeta.v).toBe(2);
      expect(parsedMeta.data.streak).toBe(2);
    });

    it('deve migrar da chave v1 na primeira carga e apagar a chave antiga', async () => {
      const mockOldData = {
        streak: 5,
        bestStreak: 10,
        blindSpotQueue: ['q-blind'],
        errorQueue: ['q-err'],
        attempts: [],
        revisoesSRS: {},
        simuladosHistorico: [],
      };

      mockStore[OLD_STORAGE_KEY_V1] = JSON.stringify(mockOldData);

      const loaded = await loadInitialStats();

      expect(loaded.streak).toBe(5);
      expect(loaded.bestStreak).toBe(10);
      expect(mockStore[OLD_STORAGE_KEY_V1]).toBeUndefined();
      expect(mockStore[KEY_META_V2]).toBeDefined();
    });
  });
});
