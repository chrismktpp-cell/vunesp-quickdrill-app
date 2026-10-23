import { describe, expect, it, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  salvarSimuladoAtivo,
  carregarSimuladoAtivo,
  limparSimuladoAtivo,
  KEY_ACTIVE_SIMULADO,
} from '../services/activeSimuladoStorage';
import type { Question, SimuladoConfig, SimuladoResposta } from '../types/schema';

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

describe('SimuladoPersistence - Resiliência, Recuperação e Prevenção de Drift', () => {
  beforeEach(async () => {
    mockStore = {};
    await AsyncStorage.clear();
  });

  const mockConfig: SimuladoConfig = {
    id: 'sim-express',
    titulo: 'Simulado Express 15Q',
    quantidadeQuestoes: 15,
    duracaoMinutos: 30,
  };

  const mockQuestions: Question[] = [
    {
      id: 'q1',
      category: 'Crase (VUNESP)',
      subtopic: 'Regra geral',
      statement: 'Enunciado 1',
      options: ['a', 'b'],
      correctIndex: 0,
      raioX: 'Explicação',
      difficulty: 'Fácil',
    },
  ];

  it('1. salva e recupera com sucesso o simulado ativo em andamento', async () => {
    const startedAt = Date.now() - 5000; // 5 segundos atrás
    const respostas: Record<string, SimuladoResposta> = {
      q1: { perguntaId: 'q1', selectedOptionIndex: 0 },
    };

    await salvarSimuladoAtivo({
      config: mockConfig,
      questions: mockQuestions,
      currentIndex: 0,
      respostas,
      startedAt,
      totalDurationSeconds: 1800,
    });

    const recuperado = await carregarSimuladoAtivo();
    expect(recuperado).not.toBeNull();
    expect(recuperado?.v).toBe(1);
    expect(recuperado?.config.id).toBe('sim-express');
    expect(recuperado?.questions).toHaveLength(1);
    expect(recuperado?.respostas.q1.selectedOptionIndex).toBe(0);
    expect(recuperado?.startedAt).toBe(startedAt);
  });

  it('2. calcula o tempo restante de forma determinística sem sofrer drift em segundo plano', async () => {
    const duracaoTotal = 1800; // 30 minutos
    const dezMinutosAtras = Date.now() - 10 * 60 * 1000;

    await salvarSimuladoAtivo({
      config: mockConfig,
      questions: mockQuestions,
      currentIndex: 0,
      respostas: {},
      startedAt: dezMinutosAtras,
      totalDurationSeconds: duracaoTotal,
    });

    const salvo = await carregarSimuladoAtivo();
    expect(salvo).not.toBeNull();

    // Simula o cálculo de wall-clock após retorno do app do segundo plano
    const elapsed = Math.floor((Date.now() - salvo!.startedAt) / 1000);
    const remaining = Math.max(0, salvo!.totalDurationSeconds - elapsed);

    // Deve ter aproximadamente 20 minutos (1200s) restantes, com margem de 2 segundos
    expect(remaining).toBeGreaterThanOrEqual(1198);
    expect(remaining).toBeLessThanOrEqual(1202);
  });

  it('3. limpa o simulado ativo ao finalizar ou descartar', async () => {
    await salvarSimuladoAtivo({
      config: mockConfig,
      questions: mockQuestions,
      currentIndex: 0,
      respostas: {},
      startedAt: Date.now(),
      totalDurationSeconds: 1800,
    });

    let recuperado = await carregarSimuladoAtivo();
    expect(recuperado).not.toBeNull();

    await limparSimuladoAtivo();
    recuperado = await carregarSimuladoAtivo();
    expect(recuperado).toBeNull();
  });

  it('4. leitura defensiva: recupera com segurança de JSON corrompido ou versão incompatível', async () => {
    // 4a. JSON quebrado
    await AsyncStorage.setItem(KEY_ACTIVE_SIMULADO, '{ invalid json');
    const resultadoInvalido = await carregarSimuladoAtivo();
    expect(resultadoInvalido).toBeNull();

    // 4b. Versão incompatível
    await AsyncStorage.setItem(KEY_ACTIVE_SIMULADO, JSON.stringify({ v: 99, config: mockConfig }));
    const resultadoVersao = await carregarSimuladoAtivo();
    expect(resultadoVersao).toBeNull();
  });
});
