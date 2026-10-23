import type { Question, UserStats, CategoryType } from '../types/schema';
import { gerarFilaDoDia } from './srsEngine';

export interface RecomendacaoEstudo {
  tipo: 'revisao_srs' | 'ponto_cego' | 'revisao_erros' | 'topico_fraco' | 'sessao_geral';
  titulo: string;
  subtitulo: string;
  badgeLabel: string;
  questoes: Question[];
  prioridade: number; // 1 = máxima prioridade
}

/**
 * Recomenda a próxima atividade de estudos do candidato com base em:
 * 1. Revisões vencidas do SRS (Fila do Dia)
 * 2. Pontos cegos da banca (certeza + erro)
 * 3. Erros recentes pendentes
 * 4. Matéria com menor aproveitamento
 * 5. Sessão do edital geral
 */
export function obterProximaAtividadeRecomendada(
  allQuestions: Question[],
  stats: UserStats
): RecomendacaoEstudo {
  const revisoesSRS = stats.revisoesSRS || {};
  const blindSpotQueue = stats.blindSpotQueue || [];
  const errorQueue = stats.errorQueue || [];

  // 1. Revisões vencidas do SRS
  const fila = gerarFilaDoDia(allQuestions, revisoesSRS, 10);
  if (fila.revisoesPendentes.length > 0) {
    return {
      tipo: 'revisao_srs',
      titulo: 'Revisão Espaçada do Dia',
      subtitulo: `Você tem ${fila.revisoesPendentes.length} questões com curva de esquecimento vencida.`,
      badgeLabel: 'Prioridade Alta · SRS',
      questoes: fila.revisoesPendentes.slice(0, 10),
      prioridade: 1,
    };
  }

  // 2. Pontos cegos da banca
  if (blindSpotQueue.length > 0) {
    const blindQuestoes = allQuestions.filter((q) => blindSpotQueue.includes(q.id));
    if (blindQuestoes.length > 0) {
      return {
        tipo: 'ponto_cego',
        titulo: 'Eliminar Pontos Cegos',
        subtitulo: `${blindQuestoes.length} questões onde você marcou Certeza e errou a pegadinha.`,
        badgeLabel: 'Atenção Máxima',
        questoes: blindQuestoes.slice(0, 10),
        prioridade: 2,
      };
    }
  }

  // 3. Erros recentes
  if (errorQueue.length > 0) {
    const errorQuestoes = allQuestions.filter((q) => errorQueue.includes(q.id));
    if (errorQuestoes.length > 0) {
      return {
        tipo: 'revisao_erros',
        titulo: 'Revisão de Erros Recentes',
        subtitulo: `Fixe as ${errorQuestoes.length} questões erradas nas sessões anteriores.`,
        badgeLabel: 'Recuperação',
        questoes: errorQuestoes.slice(0, 10),
        prioridade: 3,
      };
    }
  }

  // 4. Matéria com menor precisão ou tópicos não estudados
  const attempts = stats.attempts || [];
  const questoesEstudadasIds = new Set(attempts.map((a) => a.questionId));
  const questoesNaoEstudadas = allQuestions.filter((q) => !questoesEstudadasIds.has(q.id));

  if (questoesNaoEstudadas.length > 0) {
    // Agrupa por categoria
    const primeiraNaoEstudada = questoesNaoEstudadas[0];
    const catQuestoes = allQuestions.filter(
      (q) => q.category === primeiraNaoEstudada.category
    );
    return {
      tipo: 'topico_fraco',
      titulo: `Treino: ${primeiraNaoEstudada.category.split(' ')[0]}`,
      subtitulo: `Avance em novos tópicos oficiais do edital (${catQuestoes.length} questões).`,
      badgeLabel: 'Avanço do Edital',
      questoes: catQuestoes.slice(0, 10),
      prioridade: 4,
    };
  }

  // 5. Sessão Geral do Edital
  return {
    tipo: 'sessao_geral',
    titulo: 'Treino Geral de Fixação',
    subtitulo: 'Sessão mista com questões oficiais de todas as disciplinas do concurso.',
    badgeLabel: 'Treino Contínuo',
    questoes: allQuestions.slice(0, 10),
    prioridade: 5,
  };
}

