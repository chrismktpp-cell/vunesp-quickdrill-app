import type { UserStats, CertaintyLevel, Conquista, CategoryType } from '../types/schema';

export const XP_ACERTO = 10;
export const XP_BONUS_CERTEZA = 5;
export const XP_PARTICIPACAO_ERRO = 2;
export const XP_BONUS_SESSAO_PERFEITA = 25;
export const META_DIARIA_PADRAO = 15;

export interface InfoNivel {
  nivel: number;
  titulo: string;
  xpTotal: number;
  xpInicioNivel: number;
  xpProximoNivel: number;
  xpNoNivel: number;
  xpParaUpar: number;
  progressoPercentual: number; // 0 a 100
}

export const NIVEIS_CONFIG = [
  { nivel: 1, minXp: 0, titulo: 'Aspirante a Concurso' },
  { nivel: 2, minXp: 100, titulo: 'Concurseiro Focado' },
  { nivel: 3, minXp: 250, titulo: 'Estudante Avançado' },
  { nivel: 4, minXp: 500, titulo: 'Candidato Competitivo' },
  { nivel: 5, minXp: 900, titulo: 'Aprovável' },
  { nivel: 6, minXp: 1500, titulo: 'Titular da Vaga' },
  { nivel: 7, minXp: 2500, titulo: 'Mestre dos Concursos' },
];

/**
 * Retorna string YYYY-MM-DD com base em timestamp
 */
export function formatarDataCivil(timestamp: number = Date.now()): string {
  const d = new Date(timestamp);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Calcula XP recebido por uma resposta individual
 */
export function calcularXpResposta(isCorrect: boolean, certainty: CertaintyLevel): number {
  if (isCorrect) {
    return certainty === 3 ? XP_ACERTO + XP_BONUS_CERTEZA : XP_ACERTO;
  }
  return XP_PARTICIPACAO_ERRO;
}

/**
 * Calcula XP total de uma sessão concluída
 */
export function calcularXpSessao(
  questoesRespondidas: number,
  acertos: number,
  streak: number
): {
  xpQuestoes: number;
  xpBonusPerfeito: number;
  xpBonusStreak: number;
  xpTotal: number;
} {
  const xpQuestoes = acertos * XP_ACERTO + (questoesRespondidas - acertos) * XP_PARTICIPACAO_ERRO;
  const xpBonusPerfeito =
    questoesRespondidas >= 5 && acertos === questoesRespondidas ? XP_BONUS_SESSAO_PERFEITA : 0;
  const xpBonusStreak = Math.min(streak * 2, 20);
  const xpTotal = xpQuestoes + xpBonusPerfeito + xpBonusStreak;

  return {
    xpQuestoes,
    xpBonusPerfeito,
    xpBonusStreak,
    xpTotal,
  };
}

/**
 * Calcula nível, título e barra de progresso para o próximo nível
 */
export function calcularNivel(xpTotal: number = 0): InfoNivel {
  const total = Math.max(0, xpTotal);
  let nivelAtual = NIVEIS_CONFIG[0];
  let proximoNivel = NIVEIS_CONFIG[1];

  for (let i = NIVEIS_CONFIG.length - 1; i >= 0; i--) {
    if (total >= NIVEIS_CONFIG[i].minXp) {
      nivelAtual = NIVEIS_CONFIG[i];
      proximoNivel = NIVEIS_CONFIG[i + 1] || {
        nivel: nivelAtual.nivel + 1,
        minXp: nivelAtual.minXp + 1500,
        titulo: 'Mestre Lendário',
      };
      break;
    }
  }

  const xpInicioNivel = nivelAtual.minXp;
  const xpProximoNivel = proximoNivel.minXp;
  const faixaNivel = Math.max(1, xpProximoNivel - xpInicioNivel);
  const xpNoNivel = Math.min(total - xpInicioNivel, faixaNivel);
  const xpParaUpar = Math.max(0, xpProximoNivel - total);
  const progressoPercentual = Math.min(100, Math.round((xpNoNivel / faixaNivel) * 100));

  return {
    nivel: nivelAtual.nivel,
    titulo: nivelAtual.titulo,
    xpTotal: total,
    xpInicioNivel,
    xpProximoNivel,
    xpNoNivel,
    xpParaUpar,
    progressoPercentual,
  };
}

/**
 * Calcula progresso da meta diária
 */
export function calcularProgressoMeta(
  questoesHoje: number = 0,
  metaDiaria: number = META_DIARIA_PADRAO
): {
  atual: number;
  meta: number;
  percentual: number;
  concluida: boolean;
  restantes: number;
} {
  const meta = Math.max(1, metaDiaria);
  const atual = Math.max(0, questoesHoje);
  const percentual = Math.min(100, Math.round((atual / meta) * 100));
  const concluida = atual >= meta;
  const restantes = Math.max(0, meta - atual);

  return {
    atual,
    meta,
    percentual,
    concluida,
    restantes,
  };
}

/**
 * Atualiza sequência diária de estudos de forma consistente e determinística
 */
export function atualizarSequenciaDiaria(
  prevStats: UserStats,
  timestamp: number = Date.now()
): {
  streak: number;
  bestStreak: number;
  questoesHoje: number;
  dataUltimoEstudo: string;
} {
  const hoje = formatarDataCivil(timestamp);
  const ultimo = prevStats.dataUltimoEstudo;

  // Primeiro estudo da vida
  if (!ultimo) {
    return {
      streak: 1,
      bestStreak: Math.max(1, prevStats.bestStreak || 0),
      questoesHoje: 1,
      dataUltimoEstudo: hoje,
    };
  }

  // Mesmo dia: mantém sequência e incrementa contador de hoje
  if (ultimo === hoje) {
    const questoesHoje = (prevStats.questoesHoje || 0) + 1;
    return {
      streak: Math.max(1, prevStats.streak),
      bestStreak: Math.max(prevStats.bestStreak || 0, prevStats.streak),
      questoesHoje,
      dataUltimoEstudo: hoje,
    };
  }

  // Calcula diferença de dias
  const dataHojeObj = new Date(hoje);
  const dataUltimoObj = new Date(ultimo);
  const diffDias = Math.round((dataHojeObj.getTime() - dataUltimoObj.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias === 1) {
    // Dia seguinte consecutivo: sequência avança!
    const novaStreak = (prevStats.streak || 0) + 1;
    return {
      streak: novaStreak,
      bestStreak: Math.max(prevStats.bestStreak || 0, novaStreak),
      questoesHoje: 1,
      dataUltimoEstudo: hoje,
    };
  } else {
    // Quebrou a sequência: reinicia para 1
    return {
      streak: 1,
      bestStreak: prevStats.bestStreak || 0,
      questoesHoje: 1,
      dataUltimoEstudo: hoje,
    };
  }
}

/**
 * Catálogo de Conquistas Reais baseadas em marcos tangíveis de estudo
 */
export const CATALOGO_CONQUISTAS = [
  {
    id: 'primeiro_passo',
    titulo: 'Primeiro Passo',
    descricao: 'Resolva sua primeira questão no app.',
    icone: 'footsteps',
    categoria: 'estudo' as const,
    meta: 1,
  },
  {
    id: 'meta_diaria',
    titulo: 'Compromisso Diário',
    descricao: 'Atinja sua meta diária de questões.',
    icone: 'trophy',
    categoria: 'constancia' as const,
    meta: 1,
  },
  {
    id: 'fogo_3dias',
    titulo: 'Fogo nos Estudos',
    descricao: 'Mantenha 3 dias consecutivos de sequência.',
    icone: 'flame',
    categoria: 'constancia' as const,
    meta: 3,
  },
  {
    id: 'semana_ouro',
    titulo: 'Semana de Ouro',
    descricao: 'Complete 7 dias seguidos de preparação ativa.',
    icone: 'medal',
    categoria: 'constancia' as const,
    meta: 7,
  },
  {
    id: 'mestre_srs_10',
    titulo: 'Guardião da Memória',
    descricao: 'Tenha 10 questões consolidadas no SRS (Caixa 3+).',
    icone: 'shield-checkmark',
    categoria: 'precisao' as const,
    meta: 10,
  },
  {
    id: 'ponto_cego_vencido',
    titulo: 'Fim da Ilusão',
    descricao: 'Vença e domine uma questão que antes era Ponto Cego.',
    icone: 'eye',
    categoria: 'desafio' as const,
    meta: 1,
  },
  {
    id: 'simulado_completo',
    titulo: 'Guerreiro de Prova',
    descricao: 'Conclua seu primeiro Simulado VUNESP completo.',
    icone: 'stopwatch',
    categoria: 'desafio' as const,
    meta: 1,
  },
];

/**
 * Avalia quais conquistas o usuário desbloqueou
 */
export function avaliarConquistas(stats: UserStats): Conquista[] {
  const totalRespondidas = (stats.totalAcertos || 0) + (stats.totalErros || 0);
  const srsDominadas = Object.values(stats.revisoesSRS || {}).filter((r) => r.caixa >= 3).length;
  const simuladosConcluidos = (stats.simuladosHistorico || []).length;
  const metaBatida = (stats.questoesHoje || 0) >= (stats.metaDiaria || META_DIARIA_PADRAO);
  const streak = stats.streak || 0;

  return CATALOGO_CONQUISTAS.map((c) => {
    let progressoAtual = 0;
    let desbloqueada = false;

    switch (c.id) {
      case 'primeiro_passo':
        progressoAtual = Math.min(c.meta, totalRespondidas);
        desbloqueada = totalRespondidas >= 1;
        break;
      case 'meta_diaria':
        progressoAtual = metaBatida ? 1 : 0;
        desbloqueada = metaBatida;
        break;
      case 'fogo_3dias':
        progressoAtual = Math.min(c.meta, streak);
        desbloqueada = streak >= 3;
        break;
      case 'semana_ouro':
        progressoAtual = Math.min(c.meta, streak);
        desbloqueada = streak >= 7;
        break;
      case 'mestre_srs_10':
        progressoAtual = Math.min(c.meta, srsDominadas);
        desbloqueada = srsDominadas >= 10;
        break;
      case 'ponto_cego_vencido':
        // Se tinha ponto cego e acertou com certeza
        const temTentativaRecenteDeSuperacao = (stats.attempts || []).some(
          (a) => a.classification === 'real_mastery'
        );
        progressoAtual = temTentativaRecenteDeSuperacao ? 1 : 0;
        desbloqueada = temTentativaRecenteDeSuperacao;
        break;
      case 'simulado_completo':
        progressoAtual = Math.min(c.meta, simuladosConcluidos);
        desbloqueada = simuladosConcluidos >= 1;
        break;
    }

    return {
      id: c.id,
      titulo: c.titulo,
      descricao: c.descricao,
      icone: c.icone,
      categoria: c.categoria,
      desbloqueada,
      progressoAtual,
      progressoMeta: c.meta,
    };
  });
}

