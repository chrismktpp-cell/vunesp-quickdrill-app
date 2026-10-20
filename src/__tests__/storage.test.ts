import { describe, it, expect, vi, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  aplicarResposta,
  loadInitialStats,
  saveAttemptToStorage,
  saveSimuladoToStorage,
  migrate,
  wrapEnvelope,
  podarOrfaosSRS,
  validarBackup,
  restaurarBackup,
  OLD_STORAGE_KEY_V1,
  KEY_META_V2,
  KEY_SRS_V2,
  KEY_ATTEMPTS_V2,
  KEY_SIMULADOS_V2,
  type QuickDrillBackup,
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

describe('Storage & Performance Optimizations (V2 Envelope & Mutex)', () => {
  const initialStats: UserStats = {
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

  beforeEach(async () => {
    mockStore = {};
  });

  describe('aplicarResposta (função pura em memória)', () => {
    it('deve calcular resposta correta com certeza como real_mastery e incrementar streak e acumuladores', () => {
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
      expect(newStats.totalAcertos).toBe(1);
      expect(newStats.totalErros).toBe(0);
      expect(newStats.porCategoria?.['Crase (VUNESP)']).toEqual({ acertos: 1, erros: 0 });
    });

    it('deve adicionar a blindSpotQueue se errar com certeza (blind_spot) e incrementar erros acumulados', () => {
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
      expect(newStats.totalAcertos).toBe(0);
      expect(newStats.totalErros).toBe(1);
      expect(newStats.porCategoria?.['Sujeito Oracional e Transitividade']).toEqual({ acertos: 0, erros: 1 });
    });

    it('acumuladores sobrevivem ao corte de 400 attempts', () => {
      let stats = initialStats;
      for (let i = 0; i < 410; i++) {
        const { newStats } = aplicarResposta(stats, {
          questionId: `q-${i}`,
          category: 'Crase (VUNESP)',
          selectedOptionIndex: 0,
          isCorrect: i % 2 === 0, // 205 acertos e 205 erros
          certainty: 3,
        });
        stats = newStats;
      }

      // Attempts é limitado a 400
      expect(stats.attempts.length).toBe(400);
      expect(stats.attempts[0].questionId).toBe('q-409');
      // Acumuladores refletem todas as 410 respostas
      expect(stats.totalAcertos).toBe(205);
      expect(stats.totalErros).toBe(205);
      expect(stats.porCategoria?.['Crase (VUNESP)']).toEqual({ acertos: 205, erros: 205 });
    });

    it('deve retornar feedbackTip adequado para dúvida na caixa 3 e lapse de dominada', () => {
      // Dúvida atingindo caixa 3
      const statsComCaixa2: UserStats = {
        ...initialStats,
        revisoesSRS: {
          'crase-01': {
            perguntaId: 'crase-01',
            caixa: 2,
            intervaloDias: 3,
            proximaRevisao: Date.now() + 1000,
            historicoRepeticoes: 1,
            lapses: 0,
            status: 'em_revisao',
            ultimaRevisao: Date.now() - 1000,
          },
        },
      };

      const resDuvida = aplicarResposta(statsComCaixa2, {
        questionId: 'crase-01',
        category: 'Crase (VUNESP)',
        selectedOptionIndex: 0,
        isCorrect: true,
        certainty: 2,
      });
      expect(resDuvida.feedbackTip).toBe('Dúvida não marca domínio. Acerte com certeza para avançar.');

      // Erro em questão dominada (caixa 5)
      const statsComCaixa5: UserStats = {
        ...initialStats,
        revisoesSRS: {
          'crase-02': {
            perguntaId: 'crase-02',
            caixa: 5,
            intervaloDias: 30,
            proximaRevisao: Date.now() + 1000,
            historicoRepeticoes: 5,
            lapses: 0,
            status: 'dominado',
            ultimaRevisao: Date.now() - 1000,
          },
        },
      };

      const resLapse = aplicarResposta(statsComCaixa5, {
        questionId: 'crase-02',
        category: 'Crase (VUNESP)',
        selectedOptionIndex: 1,
        isCorrect: false,
        certainty: 3,
      });
      expect(resLapse.feedbackTip).toBe('Voltou uma casa, não para o início.');
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
        gen: 4,
        savedAt: 1234567,
        data: {
          attempts: [],
          streak: 7,
          bestStreak: 12,
          blindSpotQueue: ['crase-01'],
          errorQueue: [],
          revisoesSRS: {},
          simuladosHistorico: [],
          totalAcertos: 10,
          totalErros: 3,
        },
      };

      const res = migrate(JSON.stringify(v2Envelope));
      expect(res.streak).toBe(7);
      expect(res.bestStreak).toBe(12);
      expect(res.blindSpotQueue).toEqual(['crase-01']);
      expect(res.totalAcertos).toBe(10);
      expect(res.totalErros).toBe(3);
      expect(res.gen).toBe(4);
    });

    it('deve migrar blob v1 antigo calculando acumuladores por melhor esforço a partir de attempts', () => {
      const oldBlob = {
        streak: 3,
        bestStreak: 6,
        blindSpotQueue: ['q-blind'],
        errorQueue: ['q-err'],
        attempts: [
          { questionId: 'crase-01', category: 'Crase (VUNESP)', isCorrect: true, timestamp: 100 },
          { questionId: 'crase-02', category: 'Crase (VUNESP)', isCorrect: false, timestamp: 200 },
        ],
        revisoesSRS: {
          'crase-01': {
            perguntaId: 'crase-01',
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
                pergunta: { id: 'crase-01', statement: 'Statement antigo duplicado' },
                selectedOptionIndex: 0,
                isCorrect: true,
              },
            ],
          },
        ],
      };

      const res = migrate(oldBlob);
      expect(res.streak).toBe(3);
      expect(res.revisoesSRS?.['crase-01'].caixa).toBe(2);
      expect((res.revisoesSRS?.['crase-01'] as any).fatorFacilidade).toBeUndefined();
      expect(res.simuladosHistorico?.[0].respostas[0].perguntaId).toBe('crase-01');
      expect((res.simuladosHistorico?.[0].respostas[0] as any).pergunta).toBeUndefined();
      expect(res.totalAcertos).toBe(1);
      expect(res.totalErros).toBe(1);
      expect(res.porCategoria?.['Crase (VUNESP)']).toEqual({ acertos: 1, erros: 1 });
    });
  });

  describe('Poda de órfãos e consistência de gen', () => {
    it('podarOrfaosSRS apaga IDs inexistentes no questions.json sem zerar acumuladores', () => {
      const statsComOrfaos: UserStats = {
        ...initialStats,
        blindSpotQueue: ['crase-01', 'id-inexistente-1'],
        errorQueue: ['id-inexistente-2', 'crase-02'],
        revisoesSRS: {
          'crase-01': {
            perguntaId: 'crase-01',
            caixa: 1,
            intervaloDias: 1,
            proximaRevisao: 100,
            historicoRepeticoes: 1,
            lapses: 0,
            status: 'pendente',
            ultimaRevisao: 50,
          },
          'id-orfao-srs': {
            perguntaId: 'id-orfao-srs',
            caixa: 1,
            intervaloDias: 1,
            proximaRevisao: 100,
            historicoRepeticoes: 1,
            lapses: 0,
            status: 'pendente',
            ultimaRevisao: 50,
          },
        },
        totalAcertos: 50,
        totalErros: 20,
      };

      const podado = podarOrfaosSRS(statsComOrfaos);
      expect(podado.blindSpotQueue).toEqual(['crase-01']);
      expect(podado.errorQueue).toEqual(['crase-02']);
      expect(podado.revisoesSRS?.['crase-01']).toBeDefined();
      expect(podado.revisoesSRS?.['id-orfao-srs']).toBeUndefined();
      // Não apaga acumuladores
      expect(podado.totalAcertos).toBe(50);
      expect(podado.totalErros).toBe(20);
    });

    it('loadInitialStats descarta chaves com gen divergente da meta', async () => {
      const metaEnvelope = wrapEnvelope(
        {
          gen: 10,
          streak: 3,
          bestStreak: 5,
          blindSpotQueue: ['crase-01'],
          errorQueue: [],
          totalAcertos: 3,
          totalErros: 0,
        },
        10
      );

      // srs gravado com gen 10 (consistente)
      const srsEnvelope = wrapEnvelope(
        {
          'crase-01': {
            perguntaId: 'crase-01',
            caixa: 2,
            intervaloDias: 3,
            proximaRevisao: 1000,
            historicoRepeticoes: 1,
            lapses: 0,
            status: 'em_revisao',
            ultimaRevisao: 500,
          },
        },
        10
      );

      // attempts gravado com gen 9 (divergente!)
      const attemptsEnvelope = wrapEnvelope(
        [{ questionId: 'crase-01', category: 'Crase (VUNESP)', isCorrect: true, timestamp: 1 }],
        9
      );

      mockStore[KEY_META_V2] = metaEnvelope;
      mockStore[KEY_SRS_V2] = srsEnvelope;
      mockStore[KEY_ATTEMPTS_V2] = attemptsEnvelope;

      const loaded = await loadInitialStats();
      expect(loaded.gen).toBe(10);
      // SRS consistente foi mantido
      expect(loaded.revisoesSRS?.['crase-01']).toBeDefined();
      // Attempts divergente foi descartado (vazio)
      expect(loaded.attempts).toEqual([]);
    });
  });

  describe('Backup e Restauração', () => {
    it('validarBackup rejeita formatos inválidos e versões incorretas sem tocar no storage', () => {
      expect(validarBackup('json-invalido').valido).toBe(false);
      expect(validarBackup({ v: 1 }).valido).toBe(false);
      expect(validarBackup({ v: 2, meta: {} }).valido).toBe(false);
      expect(validarBackup({ v: 2, meta: {}, srs: {}, attempts: 'nao-array', simulados: [] }).valido).toBe(false);
    });

    it('restaurarBackup substitui dados com um gen novo', async () => {
      const backupValido: QuickDrillBackup = {
        v: 2,
        exportedAt: Date.now(),
        meta: {
          gen: 2,
          streak: 15,
          bestStreak: 20,
          blindSpotQueue: ['crase-01'],
          errorQueue: [],
          totalAcertos: 80,
          totalErros: 10,
          porCategoria: {
            'Crase (VUNESP)': { acertos: 40, erros: 5 },
          } as any,
        },
        srs: {
          'crase-01': {
            perguntaId: 'crase-01',
            caixa: 4,
            intervaloDias: 14,
            proximaRevisao: 2000,
            historicoRepeticoes: 4,
            lapses: 0,
            status: 'em_revisao',
            ultimaRevisao: 1000,
          },
        },
        attempts: [],
        simulados: [],
      };

      const currentStats = { ...initialStats, gen: 5 };
      const restaurado = await restaurarBackup(backupValido, currentStats);

      // Novo gen é gerado
      expect(restaurado.gen).toBe(6);
      expect(restaurado.streak).toBe(15);
      expect(restaurado.bestStreak).toBe(20);
      expect(restaurado.totalAcertos).toBe(80);
      expect(restaurado.totalErros).toBe(10);
      expect(restaurado.revisoesSRS?.['crase-01'].caixa).toBe(4);

      // Verificação de persistência no mockStore
      expect(mockStore[KEY_META_V2]).toBeDefined();
      const metaSalva = JSON.parse(mockStore[KEY_META_V2]);
      expect(metaSalva.gen).toBe(6);
    });
  });
});
