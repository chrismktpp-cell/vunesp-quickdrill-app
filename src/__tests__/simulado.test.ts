import { describe, it, expect } from 'vitest';
import {
  gerarQuestoesSimulado,
  calcularResultadoSimulado,
  obterDiagnosticoSimulado,
  converterErrosSimuladoParaSRS,
  CONFIGURACOES_PADRAO_SIMULADO,
} from '../services/simuladoService';
import type { Question, SimuladoResposta, UserStats, SimuladoResultado } from '../types/schema';

const mockQuestoes: Question[] = [
  {
    id: 's-1',
    category: 'Crase (VUNESP)',
    subtopic: 'Pronomes',
    statement: 'Questão 1',
    options: ['A', 'B'],
    correctIndex: 0,
    raioX: 'Macete 1',
    difficulty: 'Fácil',
  },
  {
    id: 's-2',
    category: 'Crase (VUNESP)',
    subtopic: 'Horas',
    statement: 'Questão 2',
    options: ['A', 'B'],
    correctIndex: 1,
    raioX: 'Macete 2',
    difficulty: 'Média',
  },
  {
    id: 's-3',
    category: 'Nova Lei de Licitações (Lei 14.133/2021)',
    subtopic: 'Dispensa',
    statement: 'Questão 3',
    options: ['A', 'B'],
    correctIndex: 0,
    raioX: 'Macete 3',
    difficulty: 'Fácil',
  },
  {
    id: 's-4',
    category: 'Nova Lei de Licitações (Lei 14.133/2021)',
    subtopic: 'Inexigibilidade',
    statement: 'Questão 4',
    options: ['A', 'B'],
    correctIndex: 1,
    raioX: 'Macete 4',
    difficulty: 'Difícil',
  },
];

describe('Simulado Service', () => {
  it('deve gerar a quantidade solicitada de questões para o simulado', () => {
    const questoes = gerarQuestoesSimulado(mockQuestoes, 2);
    expect(questoes.length).toBe(2);
  });

  it('deve balancear questões entre as categorias disponíveis', () => {
    const questoes = gerarQuestoesSimulado(mockQuestoes, 4);
    expect(questoes.length).toBe(4);
    const craseCount = questoes.filter((q) => q.category === 'Crase (VUNESP)').length;
    const licitCount = questoes.filter(
      (q) => q.category === 'Nova Lei de Licitações (Lei 14.133/2021)'
    ).length;
    expect(craseCount).toBe(2);
    expect(licitCount).toBe(2);
  });

  it('deve calcular acertos, erros e questões em branco com precisão ao submeter', () => {
    const config = CONFIGURACOES_PADRAO_SIMULADO[0]; // 10 questões, 15 min
    const respostas: Record<string, SimuladoResposta> = {
      's-1': { perguntaId: 's-1', selectedOptionIndex: 0 }, // Correto (gabarito 0)
      's-2': { perguntaId: 's-2', selectedOptionIndex: 0 }, // Errado (gabarito 1)
      's-3': { perguntaId: 's-3', selectedOptionIndex: null }, // Em branco
      's-4': { perguntaId: 's-4', selectedOptionIndex: 1 }, // Correto (gabarito 1)
    };

    const resultado = calcularResultadoSimulado(mockQuestoes, respostas, 450, config);

    expect(resultado.totalQuestoes).toBe(4);
    expect(resultado.acertos).toBe(2);
    expect(resultado.erros).toBe(1);
    expect(resultado.emBranco).toBe(1);
    expect(resultado.pontuacaoPercentual).toBe(50); // 2 / 4 = 50%
    expect(resultado.tempoTotalGastoSegundos).toBe(450);

    // Categoria Crase: 1 acerto de 2 = 50%
    expect(resultado.detalhesPorCategoria['Crase (VUNESP)'].acertos).toBe(1);
    expect(resultado.detalhesPorCategoria['Crase (VUNESP)'].total).toBe(2);
    expect(resultado.detalhesPorCategoria['Crase (VUNESP)'].taxa).toBe(50);

    // Formato leve de respostas (apenas perguntaId, sem duplicar o objeto Question)
    expect(resultado.respostas[0]).toEqual({
      perguntaId: 's-1',
      selectedOptionIndex: 0,
      isCorrect: true,
    });
    expect((resultado.respostas[0] as any).pergunta).toBeUndefined();
  });

  it('deve fornecer diagnóstico correto com base na faixa de pontuação', () => {
    const d90 = obterDiagnosticoSimulado(90);
    expect(d90.classificacao).toBe('Excelente');

    const d75 = obterDiagnosticoSimulado(75);
    expect(d75.classificacao).toBe('Aprovado');

    const d60 = obterDiagnosticoSimulado(60);
    expect(d60.classificacao).toBe('Alerta');

    const d40 = obterDiagnosticoSimulado(40);
    expect(d40.classificacao).toBe('Crítico');
  });

  it('deve converter apenas erros efetivamente respondidos para a errorQueue e Caixa 1 do SRS, sem punir questões em branco', () => {
    const timestampTeste = 1760880000000;
    const initialStats: UserStats = {
      attempts: [],
      streak: 5,
      bestStreak: 10,
      blindSpotQueue: [],
      errorQueue: ['s-99'],
      revisoesSRS: {
        's-2': {
          perguntaId: 's-2',
          caixa: 3,
          intervaloDias: 7,
          proximaRevisao: timestampTeste + 7 * 86400000,
          historicoRepeticoes: 3,
          lapses: 0,
          status: 'em_revisao',
          ultimaRevisao: timestampTeste - 86400000,
        },
        's-3': {
          perguntaId: 's-3',
          caixa: 4,
          intervaloDias: 14,
          proximaRevisao: timestampTeste + 14 * 86400000,
          historicoRepeticoes: 4,
          lapses: 0,
          status: 'em_revisao',
          ultimaRevisao: timestampTeste - 86400000,
        },
      },
    };

    const resultado: SimuladoResultado = {
      id: 'sim-test-1',
      titulo: 'Simulado Teste',
      dataHora: timestampTeste,
      tempoTotalGastoSegundos: 600,
      duracaoTotalSegundos: 900,
      totalQuestoes: 3,
      acertos: 1,
      erros: 1,
      emBranco: 1,
      pontuacaoPercentual: 33,
      detalhesPorCategoria: {} as any,
      respostas: [
        { perguntaId: 's-1', selectedOptionIndex: 0, isCorrect: true }, // Acerto
        { perguntaId: 's-2', selectedOptionIndex: 0, isCorrect: false }, // Erro efetivo (opção errada)
        { perguntaId: 's-3', selectedOptionIndex: null, isCorrect: false }, // Em branco (tempo esgotado/pulada)
      ],
    };

    const { newStats, totalConvertidos } = converterErrosSimuladoParaSRS(
      resultado,
      initialStats,
      timestampTeste
    );

    // Apenas a questão s-2 (efetivamente errada) é convertida
    expect(totalConvertidos).toBe(1);
    expect(newStats.errorQueue).toContain('s-2');
    expect(newStats.errorQueue).not.toContain('s-3'); // Em branco NÃO vai para errorQueue
    expect(newStats.errorQueue).toContain('s-99'); // manteve pré-existente sem duplicar
    expect(newStats.errorQueue).not.toContain('s-1');

    // s-2 foi resetada para caixa 1 e pendente
    const srs2 = newStats.revisoesSRS!['s-2'];
    expect(srs2.caixa).toBe(1);
    expect(srs2.intervaloDias).toBe(1);
    expect(srs2.status).toBe('pendente');
    expect(srs2.lapses).toBe(1);

    // s-3 (em branco) manteve sua caixa 4 intacta sem degradação injusta
    const srs3 = newStats.revisoesSRS!['s-3'];
    expect(srs3.caixa).toBe(4);
    expect(srs3.intervaloDias).toBe(14);
    expect(srs3.status).toBe('em_revisao');
  });
});

