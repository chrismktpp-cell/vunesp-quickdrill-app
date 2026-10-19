import type { Question, RevisaoSRS, FilaDoDia, CertaintyLevel } from '../types/schema';

// Intervalos de Leitner em dias: Caixa 1 (1d), Caixa 2 (3d), Caixa 3 (7d), Caixa 4 (14d), Caixa 5 (30d)
export const INTERVALOS_CAIXA_DIAS: Record<number, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Formata um timestamp ou Date para YYYY-MM-DD no fuso horário local.
 */
export function formatarDataCivilLocal(timestampOuDate: number | Date = Date.now()): string {
  const d = typeof timestampOuDate === 'number' ? new Date(timestampOuDate) : timestampOuDate;
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Gerador determinístico pseudo-aleatório baseado em seed string (linear congruente).
 */
function criarPrng(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let s = h >>> 0;
  return function next() {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Embaralha um array de forma pura e determinística com base na seed do dia civil local.
 */
export function shuffleComSeed<T>(array: T[], seedStr: string): T[] {
  const copia = [...array];
  const rand = criarPrng(seedStr);
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Cria um registro SRS inicial para uma questão nova.
 */
export function criarRevisaoInicial(perguntaId: string, timestamp: number = Date.now()): RevisaoSRS {
  return {
    perguntaId,
    caixa: 1,
    intervaloDias: 1,
    proximaRevisao: timestamp + INTERVALOS_CAIXA_DIAS[1] * MS_PER_DAY,
    historicoRepeticoes: 0,
    lapses: 0,
    status: 'pendente',
    ultimaRevisao: timestamp,
  };
}

/**
 * Atualiza o registro SRS após a resposta do usuário.
 * Regras explícitas de certeza:
 * - Certeza 3 + Acerto: sobe 1 caixa (teto 5). Status dominado apenas na caixa 5.
 * - Certeza 2 + Acerto: sobe no máximo 1 caixa (teto 3). Não atinge 'dominado'.
 * - Certeza 1 + Acerto: caixa 1, intervalo 1d (acerto frágil).
 * - Erro: caixa 1, intervalo 1d, lapsos + 1, status 'pendente'.
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
      srs.caixa = Math.min(5, srs.caixa + 1);
      srs.intervaloDias = INTERVALOS_CAIXA_DIAS[srs.caixa] || 30;
      srs.status = srs.caixa >= 5 ? 'dominado' : 'em_revisao';
    } else if (certainty === 2) {
      // Sobe no máximo 1 caixa, com teto na caixa 3
      srs.caixa = Math.min(3, srs.caixa + 1);
      srs.intervaloDias = INTERVALOS_CAIXA_DIAS[srs.caixa] || 7;
      srs.status = 'em_revisao';
    } else {
      // Chute (1) + Acerto: acerto frágil, permanece na caixa 1
      srs.caixa = 1;
      srs.intervaloDias = 1;
      srs.status = 'em_revisao';
    }
  } else {
    // Erro (Lapse): volta à caixa 1
    srs.lapses += 1;
    srs.caixa = 1;
    srs.intervaloDias = 1;
    srs.status = 'pendente';
  }

  srs.proximaRevisao = timestamp + srs.intervaloDias * MS_PER_DAY;
  return srs;
}

/**
 * Verifica se uma questão tem revisão pendente para a data de referência.
 * Se já foi respondida no mesmo dia civil da referência, NÃO é pendente hoje.
 */
export function estaPendenteParaRevisao(
  revisao: RevisaoSRS | undefined,
  dataReferencia: number = Date.now()
): boolean {
  if (!revisao) return false;

  const diaRef = formatarDataCivilLocal(dataReferencia);

  // Se já foi respondida hoje (mesmo dia civil local), não entra na fila hoje
  if (revisao.ultimaRevisao) {
    const diaUltima = formatarDataCivilLocal(revisao.ultimaRevisao);
    if (diaUltima === diaRef) {
      return false;
    }
  }

  const diaProxima = formatarDataCivilLocal(revisao.proximaRevisao);
  return diaProxima <= diaRef;
}

/**
 * Gera a "Fila do Dia":
 * 1. Prioriza revisões pendentes (sem repetir as já respondidas no mesmo dia civil).
 * 2. Em seguida, adiciona questões novas com ordem determinística baseada na data civil local.
 */
export function gerarFilaDoDia(
  todasPerguntas: Question[],
  srsMap: Record<string, RevisaoSRS> = {},
  limiteNovas: number = 10,
  dataReferencia: number = Date.now()
): FilaDoDia {
  const revisoesPendentes: Question[] = [];
  const novasQuestoes: Question[] = [];
  const diaRef = formatarDataCivilLocal(dataReferencia);

  for (const pergunta of todasPerguntas) {
    const srs = srsMap[pergunta.id];
    if (srs) {
      if (estaPendenteParaRevisao(srs, dataReferencia)) {
        revisoesPendentes.push(pergunta);
      }
    } else {
      novasQuestoes.push(pergunta);
    }
  }

  // Ordena revisões pendentes pelas mais atrasadas primeiro
  revisoesPendentes.sort((a, b) => {
    const srsA = srsMap[a.id];
    const srsB = srsMap[b.id];
    return (srsA?.proximaRevisao ?? 0) - (srsB?.proximaRevisao ?? 0);
  });

  // Embaralha novas questões com seed determinística do dia civil local (YYYY-MM-DD)
  const novasEmbaralhadas = shuffleComSeed(novasQuestoes, diaRef);
  const novasSelecionadas = novasEmbaralhadas.slice(0, limiteNovas);

  return {
    revisoesPendentes,
    novasQuestoes: novasSelecionadas,
    totalHoje: revisoesPendentes.length + novasSelecionadas.length,
    timestampCalculo: dataReferencia,
  };
}

/**
 * Resumo estatístico do estado do SRS.
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

    if (estaPendenteParaRevisao(srs, dataReferencia)) {
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
