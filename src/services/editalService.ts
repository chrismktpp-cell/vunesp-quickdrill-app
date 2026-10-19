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

  // Indexa questões antecipadamente em Map para lookup O(1)
  const questoesPorCategoria = new Map<string, Question[]>();
  const questoesPorTopicoId = new Map<string, Question[]>();
  for (const q of questoes) {
    if (q.category) {
      const list = questoesPorCategoria.get(q.category) || [];
      list.push(q);
      questoesPorCategoria.set(q.category, list);
    }
    if (q.editalTopicoId) {
      const list = questoesPorTopicoId.get(q.editalTopicoId) || [];
      list.push(q);
      questoesPorTopicoId.set(q.editalTopicoId, list);
    }
  }

  return topicos.map((topico) => {
    // Lookup O(1) combinando por categoria e id do tópico sem varredura completa
    const porCat = questoesPorCategoria.get(topico.category) || [];
    const porId = questoesPorTopicoId.get(topico.id) || [];
    const questoesDoTopicoMap = new Map<string, Question>();
    for (const q of porCat) questoesDoTopicoMap.set(q.id, q);
    for (const q of porId) questoesDoTopicoMap.set(q.id, q);
    const questoesDoTopico = Array.from(questoesDoTopicoMap.values());

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

  // Agrupa previamente os tópicos por matéria via Map para lookup O(1)
  const topicosPorMateria = new Map<string, EditalTopico[]>();
  for (const topico of topicos) {
    const list = topicosPorMateria.get(topico.materia) || [];
    list.push(topico);
    topicosPorMateria.set(topico.materia, list);
  }

  const totalTopicos = topicos.length;
  const percentualGeralCobertura =
    totalTopicos > 0 ? Math.round(somaCoberturas / totalTopicos) : 0;
  const taxaGeralAcerto =
    totalRespondidas > 0 ? Math.round((somaAcertos / totalRespondidas) * 100) : 0;

  // Calcula % de cobertura individual de cada matéria sem varreduras repetidas
  for (const [materiaKey, topicosDaMateria] of topicosPorMateria.entries()) {
    const somaCobMat = topicosDaMateria.reduce(
      (acc, t) => acc + (mapaProgresso.get(t.id)?.percentualCobertura || 0),
      0
    );
    if (porMateria[materiaKey]) {
      porMateria[materiaKey].percentualCobertura =
        topicosDaMateria.length > 0 ? Math.round(somaCobMat / topicosDaMateria.length) : 0;
    }
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

