import { describe, it, expect } from 'vitest';
import {
  gerarQuestoesSimulado,
  calcularResultadoSimulado,
  obterDiagnosticoSimulado,
  CONFIGURACOES_PADRAO_SIMULADO,
} from '../services/simuladoService';
import type { Question, SimuladoResposta } from '../types/schema';

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
});

