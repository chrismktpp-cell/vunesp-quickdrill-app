import type { Question, RevisaoSRS, FilaDoDia, CertaintyLevel, SRSStatus } from '../types/schema';

// Leitner intervals in days: Box 1 (1d), Box 2 (3d), Box 3 (7d), Box 4 (14d), Box 5 (30d)
export const INTERVALOS_CAIXA_DIAS: Record<number, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Cria um registro SRS padrão para uma questão nova.
 */
export function criarRevisaoInicial(perguntaId: string, timestamp: number = Date.now()): RevisaoSRS {
  return {
    perguntaId,
    caixa: 1,
    intervaloDias: 1,
    proximaRevisao: timestamp + INTERVALOS_CAIXA_DIAS[1] * MS_PER_DAY,
    historicoRepeticoes: 0,
    fatorFacilidade: 2.5,
    lapses: 0,
    status: 'pendente',
    ultimaRevisao: timestamp,
  };
}

/**
 * Atualiza o registro SRS após uma resposta do usuário, combinando Leitner com SM-2.
 */
export function processarRespostaSRS(
  revisaoAtual: RevisaoSRS | undefined,
  perguntaId: string,
  isCorrect: boolean,
  certainty: CertaintyLevel,
  timestamp: number = Date.now()
): RevisaoSRS {
  const srs = revisaoAtual ? { ...revisaoAtual } : criarRevisaoInicial(perguntaId, timestamp);
  srs.historicoRepeticoes += 1;
  srs.ultimaRevisao = timestamp;

  if (isCorrect) {
    if (certainty === 3) {
      // Certeza + Acerto: progressão completa de caixa
      srs.caixa = Math.min(5, srs.caixa + 1);
      srs.intervaloDias = INTERVALOS_CAIXA_DIAS[srs.caixa] || 30;
      srs.fatorFacilidade = Math.min(3.0, +(srs.fatorFacilidade + 0.1).toFixed(2));
      srs.status = srs.caixa >= 5 ? 'dominado' : 'em_revisao';
    } else if (certainty === 2) {
      // Dúvida + Acerto: avança se estava na caixa 1, ou mantém intervalo moderado
      srs.caixa = Math.min(4, Math.max(1, srs.caixa));
      srs.intervaloDias = INTERVALOS_CAIXA_DIAS[srs.caixa] || 1;
      srs.status = 'em_revisao';
    } else {
      // Chute (1) + Acerto: acerto frágil! Não avança de caixa, fixa em 1 dia para fixação
      srs.caixa = 1;
      srs.intervaloDias = 1;
      srs.status = 'em_revisao';
    }
  } else {
    // Erro (Lapse)
    srs.lapses += 1;
    srs.caixa = 1;
    srs.intervaloDias = 1;
    srs.status = 'pendente';

    // Se errou com Certeza (Ponto Cego Crítico), penalidade mais alta no fator de facilidade
    if (certainty === 3) {
      srs.fatorFacilidade = Math.max(1.3, +(srs.fatorFacilidade - 0.3).toFixed(2));
    } else {
      srs.fatorFacilidade = Math.max(1.3, +(srs.fatorFacilidade - 0.15).toFixed(2));
    }
  }

  srs.proximaRevisao = timestamp + srs.intervaloDias * MS_PER_DAY;
  return srs;
}

/**
 * Verifica se uma questão tem revisão pendente para a data de referência.
 */
export function estaPendenteParaRevisao(revisao: RevisaoSRS | undefined, dataReferencia: number = Date.now()): boolean {
  if (!revisao) return false;
  return revisao.proximaRevisao <= dataReferencia;
}

/**
 * Gera a "Fila do Dia":
 * 1. Prioriza revisões pendentes no algoritmo SRS (ordenadas pelas mais atrasadas primeiro).
 * 2. Em seguida, inclui questões novas (ainda não estudadas), limitadas por `limiteNovas`.
 */
export function gerarFilaDoDia(
  todasPerguntas: Question[],
  srsMap: Record<string, RevisaoSRS> = {},
  limiteNovas: number = 10,
  dataReferencia: number = Date.now()
): FilaDoDia {
  const revisoesPendentes: Question[] = [];
  const novasQuestoes: Question[] = [];

  for (const pergunta of todasPerguntas) {
    const srs = srsMap[pergunta.id];
    if (srs) {
      if (srs.proximaRevisao <= dataReferencia) {
        revisoesPendentes.push(pergunta);
      }
    } else {
      novasQuestoes.push(pergunta);
    }
  }

  // Ordena revisões pendentes: as com proximaRevisao mais antiga vêm primeiro (mais urgentes)
  revisoesPendentes.sort((a, b) => {
    const srsA = srsMap[a.id];
    const srsB = srsMap[b.id];
    return (srsA?.proximaRevisao ?? 0) - (srsB?.proximaRevisao ?? 0);
  });

  const novasSelecionadas = novasQuestoes.slice(0, limiteNovas);

  return {
    revisoesPendentes,
    novasQuestoes: novasSelecionadas,
    totalHoje: revisoesPendentes.length + novasSelecionadas.length,
    timestampCalculo: dataReferencia,
  };
}

/**
 * Resumo estatístico do estado do SRS do concurseiro.
 */
export function resumirSRS(
  todasPerguntas: Question[],
  srsMap: Record<string, RevisaoSRS> = {},
  dataReferencia: number = Date.now()
): {
  totalQuestoes: number;
  novas: number;
  pendentesHoje: number;
  emRevisao: number;
  dominadas: number;
  pontosCegosComLapse: number;
} {
  let novas = 0;
  let pendentesHoje = 0;
  let emRevisao = 0;
  let dominadas = 0;
  let pontosCegosComLapse = 0;

  for (const pergunta of todasPerguntas) {
    const srs = srsMap[pergunta.id];
    if (!srs) {
      novas += 1;
      continue;
    }

    if (srs.lapses > 0) {
      pontosCegosComLapse += 1;
    }

    if (srs.status === 'dominado') {
      dominadas += 1;
    } else {
      emRevisao += 1;
    }

    if (srs.proximaRevisao <= dataReferencia) {
      pendentesHoje += 1;
    }
  }

  return {
    totalQuestoes: todasPerguntas.length,
    novas,
    pendentesHoje,
    emRevisao,
    dominadas,
    pontosCegosComLapse,
  };
}
