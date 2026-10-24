import { describe, it, expect } from 'vitest';
import {
  obterDiaRoteiro,
  filtrarQuestoesDoDia,
  calcularStatusTrilha,
  registrarConclusaoDiaTrilha,
} from '../services/trilhaService';
import { PLANO_7_DIAS } from '../data/planoEstudosRoteiro';
import type { Question, UserStats } from '../types/schema';

const mockQuestions: Question[] = [
  {
    id: 'q-lp-1',
    category: 'Sujeito Oracional e Transitividade',
    subtopic: 'Haver impessoal (existir)',
    statement: 'Havia muitas dúvidas...',
    options: ['A', 'B'],
    correctIndex: 0,
    raioX: 'Macete Haver',
    difficulty: 'Fácil',
  },
  {
    id: 'q-lp-2',
    category: 'Sujeito Oracional e Transitividade',
    subtopic: 'Concordância verbal',
    statement: 'Convém que estudem...',
    options: ['A', 'B'],
    correctIndex: 0,
    raioX: 'Macete Sujeito Oracional',
    difficulty: 'Média',
  },
  {
    id: 'q-mat-1',
    category: 'Gestão de Patrimônio e Bens Públicos',
    subtopic: 'Inventário patrimonial',
    statement: 'Sobre estoques...',
    options: ['A', 'B'],
    correctIndex: 1,
    raioX: 'Macete Estoque',
    difficulty: 'Fácil',
  },
];

describe('Trilha do Conhecimento (Ciclo de 7 Dias VUNESP)', () => {
  it('deve conter exatamente 7 dias estruturados com metas e regras de blindagem', () => {
    expect(PLANO_7_DIAS.length).toBe(7);
    PLANO_7_DIAS.forEach((dia, idx) => {
      expect(dia.dia).toBe(idx + 1);
      expect(dia.titulo).toBeDefined();
      expect(dia.metaQuestoes).toBeGreaterThanOrEqual(10);
      expect(dia.aulas.length).toBeGreaterThan(0);
      expect(dia.regrasBlindagem.length).toBeGreaterThan(0);
    });
  });

  it('obterDiaRoteiro deve retornar o dia solicitado', () => {
    const dia1 = obterDiaRoteiro(1);
    expect(dia1?.titulo).toContain('Concordância');
    expect(dia1?.diaSemana).toBe('Segunda');

    const dia7 = obterDiaRoteiro(7);
    expect(dia7?.tipo).toBe('boss_semanal');
    expect(dia7?.metaQuestoes).toBe(15);
  });

  it('filtrarQuestoesDoDia deve filtrar e priorizar subtópicos relevantes', () => {
    const dia1 = obterDiaRoteiro(1)!;
    const selecionadas = filtrarQuestoesDoDia(mockQuestions, dia1);
    expect(selecionadas.length).toBe(2);
    expect(selecionadas.every((q) => q.category === 'Sujeito Oracional e Transitividade')).toBe(true);
  });

  it('calcularStatusTrilha deve manter Dia 1 aberto e dias subsequentes travados no estado inicial', () => {
    const statsIniciais: UserStats = {
      attempts: [],
      streak: 0,
      bestStreak: 0,
      blindSpotQueue: [],
      errorQueue: [],
      trilhaDias: {},
      diaAtualTrilha: 1,
    };

    const status = calcularStatusTrilha(statsIniciais);
    expect(status.diaAtual).toBe(1);
    expect(status.diasConcluidos).toBe(0);
    expect(status.percentualCiclo).toBe(0);

    expect(status.dias[0].status).toBe('aberto');
    expect(status.dias[1].status).toBe('travado');
    expect(status.dias[6].status).toBe('travado');
  });

  it('registrarConclusaoDiaTrilha deve marcar dia como concluído e destravar o próximo', () => {
    const statsIniciais: UserStats = {
      attempts: [],
      streak: 0,
      bestStreak: 0,
      blindSpotQueue: [],
      errorQueue: [],
      trilhaDias: {},
      diaAtualTrilha: 1,
      xp: 100,
    };

    // Usuário respondeu 10 questões e acertou 9 (90% = 3 estrelas)
    const statsAtualizado = registrarConclusaoDiaTrilha(statsIniciais, 1, 10, 9);

    expect(statsAtualizado.trilhaDias?.[1]?.concluido).toBe(true);
    expect(statsAtualizado.trilhaDias?.[1]?.notaPercentual).toBe(90);
    expect(statsAtualizado.diaAtualTrilha).toBe(2);
    expect(statsAtualizado.xp).toBe(150); // +50 XP bônus

    // Ao recalcular status, Dia 1 é concluído e Dia 2 está aberto
    const novoStatus = calcularStatusTrilha(statsAtualizado);
    expect(novoStatus.diasConcluidos).toBe(1);
    expect(novoStatus.dias[0].status).toBe('concluido');
    expect(novoStatus.dias[0].estrelas).toBe(3);
    expect(novoStatus.dias[1].status).toBe('aberto');
  });
});

