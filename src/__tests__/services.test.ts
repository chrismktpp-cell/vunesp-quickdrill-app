import { describe, it, expect } from 'vitest';
import { filtrarQuestoes } from '../services/filterEngine';
import { calcularProgressoPorTopico, calcularCoberturaGeral } from '../services/editalService';
import type { Question, UserStats, EditalTopico, QuestionAttempt } from '../types/schema';

const mockQuestoes: Question[] = [
  {
    id: 'q-crase-1',
    category: 'Crase (VUNESP)',
    subtopic: 'Pronomes de tratamento',
    statement: 'Entregou o documento a Vossa Excelência na Câmara de Itanhaém.',
    options: ['a', 'à'],
    correctIndex: 0,
    raioX: 'Pronomes de tratamento não admitem crase.',
    difficulty: 'Fácil',
    materia: 'Língua Portuguesa',
  },
  {
    id: 'q-crase-2',
    category: 'Crase (VUNESP)',
    subtopic: 'Horas exatas',
    statement: 'A reunião ocorreu às 14 horas.',
    options: ['às', 'as'],
    correctIndex: 0,
    raioX: 'Horas exatas exigem crase.',
    difficulty: 'Média',
    materia: 'Língua Portuguesa',
  },
  {
    id: 'q-licit-1',
    category: 'Nova Lei de Licitações (Lei 14.133/2021)',
    subtopic: 'Dispensa por valor',
    statement: 'A dispensa de licitação para compras até R$ 50 mil...',
    options: ['Dispensa', 'Inexigibilidade'],
    correctIndex: 0,
    raioX: 'Dispensa por valor é art. 75.',
    difficulty: 'Difícil',
    materia: 'Direito Administrativo',
  },
];

const mockStats: UserStats = {
  attempts: [],
  streak: 2,
  bestStreak: 5,
  blindSpotQueue: ['q-crase-1'],
  errorQueue: ['q-crase-1', 'q-licit-1'],
};

describe('Filter Engine', () => {
  it('deve filtrar por categoria', () => {
    const res = filtrarQuestoes(mockQuestoes, { category: 'Crase (VUNESP)' }, mockStats);
    expect(res.length).toBe(2);
    expect(res.every((q) => q.category === 'Crase (VUNESP)')).toBe(true);
  });

  it('deve filtrar por dificuldade', () => {
    const res = filtrarQuestoes(mockQuestoes, { dificuldade: 'Difícil' }, mockStats);
    expect(res.length).toBe(1);
    expect(res[0].id).toBe('q-licit-1');
  });

  it('deve filtrar por status de estudo (Apenas Erros)', () => {
    const res = filtrarQuestoes(mockQuestoes, { statusEstudo: 'erros' }, mockStats);
    expect(res.length).toBe(2);
    expect(res.map((q) => q.id)).toEqual(['q-crase-1', 'q-licit-1']);
  });

  it('deve filtrar por status de estudo (Pontos Cegos)', () => {
    const res = filtrarQuestoes(mockQuestoes, { statusEstudo: 'pontos_cegos' }, mockStats);
    expect(res.length).toBe(1);
    expect(res[0].id).toBe('q-crase-1');
  });

  it('deve filtrar por termo de busca no enunciado ou macete', () => {
    const res = filtrarQuestoes(mockQuestoes, { termoBusca: 'Vossa Excelência' }, mockStats);
    expect(res.length).toBe(1);
    expect(res[0].id).toBe('q-crase-1');

    const resMacete = filtrarQuestoes(mockQuestoes, { termoBusca: 'art. 75' }, mockStats);
    expect(resMacete.length).toBe(1);
    expect(resMacete[0].id).toBe('q-licit-1');
  });
});

describe('Edital Tracking Service', () => {
  const mockTopicos: EditalTopico[] = [
    {
      id: 'ed-lp-01',
      materia: 'Língua Portuguesa',
      category: 'Crase (VUNESP)',
      nome: 'Crase',
      descricao: 'Regras de crase',
      pesoOuRelevancia: 'Alta',
    },
    {
      id: 'ed-lic-01',
      materia: 'Direito Administrativo',
      category: 'Nova Lei de Licitações (Lei 14.133/2021)',
      nome: 'Licitações',
      descricao: 'Lei 14.133',
      pesoOuRelevancia: 'Alta',
    },
  ];

  it('deve calcular status "pendente" quando tópico não tiver respostas', () => {
    const progresso = calcularProgressoPorTopico(mockTopicos, mockQuestoes, []);
    expect(progresso.length).toBe(2);
    expect(progresso[0].status).toBe('pendente');
    expect(progresso[0].percentualCobertura).toBe(0);
  });

  it('deve calcular status "dominado" quando cobertura >= 50% e acertos >= 80%', () => {
    const tentativas: QuestionAttempt[] = [
      {
        questionId: 'q-crase-1',
        category: 'Crase (VUNESP)',
        selectedOptionIndex: 0,
        isCorrect: true,
        certainty: 3,
        classification: 'real_mastery',
        timestamp: 1000,
      },
      {
        questionId: 'q-crase-2',
        category: 'Crase (VUNESP)',
        selectedOptionIndex: 0,
        isCorrect: true,
        certainty: 3,
        classification: 'real_mastery',
        timestamp: 2000,
      },
    ];

    const progresso = calcularProgressoPorTopico(mockTopicos, mockQuestoes, tentativas);
    const progCrase = progresso.find((p) => p.topicoId === 'ed-lp-01');

    expect(progCrase).toBeDefined();
    expect(progCrase?.questoesRespondidas).toBe(2);
    expect(progCrase?.acertos).toBe(2);
    expect(progCrase?.taxaAcerto).toBe(100);
    expect(progCrase?.percentualCobertura).toBe(100);
    expect(progCrase?.status).toBe('dominado');
  });

  it('deve calcular a cobertura geral do edital e por matéria', () => {
    const progressoMock = [
      {
        topicoId: 'ed-lp-01',
        totalQuestoes: 2,
        questoesRespondidas: 2,
        acertos: 2,
        erros: 0,
        status: 'dominado' as const,
        percentualCobertura: 100,
        taxaAcerto: 100,
      },
      {
        topicoId: 'ed-lic-01',
        totalQuestoes: 1,
        questoesRespondidas: 0,
        acertos: 0,
        erros: 0,
        status: 'pendente' as const,
        percentualCobertura: 0,
        taxaAcerto: 0,
      },
    ];

    const cobertura = calcularCoberturaGeral(mockTopicos, progressoMock);

    expect(cobertura.totalTopicos).toBe(2);
    expect(cobertura.topicosDominados).toBe(1);
    expect(cobertura.topicosPendentes).toBe(1);
    expect(cobertura.percentualGeralCobertura).toBe(50); // (100 + 0) / 2
    expect(cobertura.porMateria['Língua Portuguesa'].percentualCobertura).toBe(100);
    expect(cobertura.porMateria['Direito Administrativo'].percentualCobertura).toBe(0);
  });
});
