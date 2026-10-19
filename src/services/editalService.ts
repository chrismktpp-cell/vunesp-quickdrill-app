import type {
  EditalTopico,
  ProgressoEdital,
  CoberturaGeralEdital,
  Question,
  QuestionAttempt,
} from '../types/schema';
import editalPadrao from '../data/edital.json';

/**
 * Vincula e calcula o progresso de estudo para cada tópico do edital com base nas tentativas.
 */
export function calcularProgressoPorTopico(
  topicos: EditalTopico[] = editalPadrao as EditalTopico[],
  questoes: Question[],
  tentativas: QuestionAttempt[]
): ProgressoEdital[] {
  // Mapeia as tentativas mais recentes por questão para saber o estado atual
  const mapaUltimaTentativa = new Map<string, QuestionAttempt>();
  for (const tent of tentativas) {
    const anterior = mapaUltimaTentativa.get(tent.questionId);
    if (!anterior || tent.timestamp > anterior.timestamp) {
      mapaUltimaTentativa.set(tent.questionId, tent);
    }
  }

  return topicos.map((topico) => {
    // Filtra questões do banco pertencentes a este tópico do edital
    const questoesDoTopico = questoes.filter(
      (q) => q.category === topico.category || q.editalTopicoId === topico.id
    );

    const totalQuestoes = questoesDoTopico.length;
    let questoesRespondidas = 0;
    let acertos = 0;
    let erros = 0;

    for (const q of questoesDoTopico) {
      const tentativa = mapaUltimaTentativa.get(q.id);
      if (tentativa) {
        questoesRespondidas += 1;
        if (tentativa.isCorrect) {
          acertos += 1;
        } else {
          erros += 1;
        }
      }
    }

    const percentualCobertura =
      totalQuestoes > 0 ? Math.round((questoesRespondidas / totalQuestoes) * 100) : 0;
    const taxaAcerto =
      questoesRespondidas > 0 ? Math.round((acertos / questoesRespondidas) * 100) : 0;

    let status: 'pendente' | 'em_revisao' | 'dominado' = 'pendente';
    if (questoesRespondidas === 0) {
      status = 'pendente';
    } else if (percentualCobertura >= 50 && taxaAcerto >= 80) {
      status = 'dominado';
    } else {
      status = 'em_revisao';
    }

    return {
      topicoId: topico.id,
      totalQuestoes,
      questoesRespondidas,
      acertos,
      erros,
      status,
      percentualCobertura,
      taxaAcerto,
    };
  });
}

/**
 * Calcula a visão global de cobertura do edital e por matéria.
 */
export function calcularCoberturaGeral(
  topicos: EditalTopico[] = editalPadrao as EditalTopico[],
  progressoTopicos: ProgressoEdital[]
): CoberturaGeralEdital {
  const mapaProgresso = new Map(progressoTopicos.map((p) => [p.topicoId, p]));

  let topicosDominados = 0;
  let topicosEmRevisao = 0;
  let topicosPendentes = 0;
  let somaCoberturas = 0;
  let somaAcertos = 0;
  let totalRespondidas = 0;

  const porMateria: CoberturaGeralEdital['porMateria'] = {};

  for (const topico of topicos) {
    const prog = mapaProgresso.get(topico.id) || {
      topicoId: topico.id,
      totalQuestoes: 0,
      questoesRespondidas: 0,
      acertos: 0,
      erros: 0,
      status: 'pendente' as const,
      percentualCobertura: 0,
      taxaAcerto: 0,
    };

    if (prog.status === 'dominado') topicosDominados += 1;
    else if (prog.status === 'em_revisao') topicosEmRevisao += 1;
    else topicosPendentes += 1;

    somaCoberturas += prog.percentualCobertura;
    somaAcertos += prog.acertos;
    totalRespondidas += prog.questoesRespondidas;

    // Agrupamento por Matéria
    const materiaKey = topico.materia;
    if (!porMateria[materiaKey]) {
      porMateria[materiaKey] = {
        totalTopicos: 0,
        dominados: 0,
        emRevisao: 0,
        pendentes: 0,
        percentualCobertura: 0,
      };
    }

    porMateria[materiaKey].totalTopicos += 1;
    if (prog.status === 'dominado') porMateria[materiaKey].dominados += 1;
    else if (prog.status === 'em_revisao') porMateria[materiaKey].emRevisao += 1;
    else porMateria[materiaKey].pendentes += 1;
  }

  const totalTopicos = topicos.length;
  const percentualGeralCobertura =
    totalTopicos > 0 ? Math.round(somaCoberturas / totalTopicos) : 0;
  const taxaGeralAcerto =
    totalRespondidas > 0 ? Math.round((somaAcertos / totalRespondidas) * 100) : 0;

  // Calcula % de cobertura individual de cada matéria
  for (const materiaKey of Object.keys(porMateria)) {
    const topicosDaMateria = topicos.filter((t) => t.materia === materiaKey);
    const somaCobMat = topicosDaMateria.reduce(
      (acc, t) => acc + (mapaProgresso.get(t.id)?.percentualCobertura || 0),
      0
    );
    porMateria[materiaKey].percentualCobertura =
      topicosDaMateria.length > 0 ? Math.round(somaCobMat / topicosDaMateria.length) : 0;
  }

  return {
    totalTopicos,
    topicosDominados,
    topicosEmRevisao,
    topicosPendentes,
    percentualGeralCobertura,
    taxaGeralAcerto,
    porMateria,
  };
}
