import { describe, expect, it } from 'vitest';
import questionsData from '../data/questions.json';
import { filtrarQuestoes } from '../services/filterEngine';
import type { Question, UserStats } from '../types/schema';

const questions = questionsData as Question[];
const emptyStats: UserStats = {
  attempts: [],
  streak: 0,
  bestStreak: 0,
  blindSpotQueue: [],
  errorQueue: [],
  revisoesSRS: {},
  simuladosHistorico: [],
};

describe('Banco Agente Patrimonial - Prefeitura de Itanhaém', () => {
  const target = questions.filter((question) => question.id.startsWith('itanhaem-ap-'));

  it('mantém lote equilibrado de 10 questões por matéria', () => {
    expect(target).toHaveLength(30);
    expect(target.filter((q) => q.materia === 'Língua Portuguesa')).toHaveLength(10);
    expect(target.filter((q) => q.materia === 'Matemática e Raciocínio Lógico')).toHaveLength(10);
    expect(target.filter((q) => q.materia === 'Conhecimentos Específicos')).toHaveLength(10);
  });

  it('usa cinco alternativas e um único índice correto em cada questão nova', () => {
    for (const question of target) {
      expect(question.options).toHaveLength(5);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(5);
      expect(question.banca).toBe('VUNESP');
      expect(question.cargo).toBe('Agente Patrimonial');
      expect(question.prova).toBe('Prefeitura de Itanhaém');
      expect(question.raioX.length).toBeGreaterThan(40);
    }
  });

  it('filtra o conjunto pela banca, cargo e prova sem incluir legado sem metadados', () => {
    const filtered = filtrarQuestoes(questions, {
      banca: 'VUNESP',
      cargo: 'Agente Patrimonial',
      prova: 'Prefeitura de Itanhaém',
      statusEstudo: 'todas',
    }, emptyStats);
    expect(filtered).toHaveLength(30);
  });
});
