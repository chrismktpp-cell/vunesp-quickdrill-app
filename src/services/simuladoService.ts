import type {
  Question,
  SimuladoConfig,
  SimuladoResposta,
  SimuladoResultado,
  CategoryType,
} from '../types/schema';

export const CONFIGURACOES_PADRAO_SIMULADO: SimuladoConfig[] = [
  {
    id: 'simulado-mini',
    titulo: 'Mini Simulado Tático (10 Questões)',
    duracaoMinutos: 15,
    quantidadeQuestoes: 10,
  },
  {
    id: 'simulado-medio',
    titulo: 'Simulado VUNESP Padrão (20 Questões)',
    duracaoMinutos: 30,
    quantidadeQuestoes: 20,
  },
  {
    id: 'simulado-completo',
    titulo: 'Simulado Prova Real Itanhaém (40 Questões)',
    duracaoMinutos: 60,
    quantidadeQuestoes: 40,
  },
];

/**
 * Embaralha um array usando Fisher-Yates
 */
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Seleciona e balanceia questões para a prova do simulado.
 */
export function gerarQuestoesSimulado(
  todasQuestoes: Question[],
  quantidade: number,
  categoriasFiltro?: CategoryType[]
): Question[] {
  let questoesElegiveis = todasQuestoes;
  if (categoriasFiltro && categoriasFiltro.length > 0) {
    questoesElegiveis = todasQuestoes.filter((q) => categoriasFiltro.includes(q.category));
  }

  // Agrupa por categoria para garantir distribuição homogênea
  const porCategoria = new Map<CategoryType, Question[]>();
  for (const q of questoesElegiveis) {
    const lista = porCategoria.get(q.category) || [];
    lista.push(q);
    porCategoria.set(q.category, lista);
  }

  const categorias = Array.from(porCategoria.keys());
  if (categorias.length === 0) return [];

  const questoesPorCat = Math.ceil(quantidade / categorias.length);
  const selecionadas: Question[] = [];

  for (const cat of categorias) {
    const doGrupo = shuffle(porCategoria.get(cat) || []).slice(0, questoesPorCat);
    selecionadas.push(...doGrupo);
  }

  // Embaralha todas selecionadas e corta no tamanho exato requisitado
  return shuffle(selecionadas).slice(0, quantidade);
}

/**
 * Calcula o resultado detalhado ao submeter o Simulado.
 * Nenhuma resposta é avaliada antes deste momento.
 */
export function calcularResultadoSimulado(
  questoes: Question[],
  respostas: Record<string, SimuladoResposta>,
  tempoTotalGastoSegundos: number,
  config: SimuladoConfig
): SimuladoResultado {
  let acertos = 0;
  let erros = 0;
  let emBranco = 0;

  const detalhesPorCategoria: SimuladoResultado['detalhesPorCategoria'] = {} as any;

  const respostasFormatadas = questoes.map((q) => {
    const resp = respostas[q.id];
    const selectedOptionIndex = resp && resp.selectedOptionIndex !== undefined ? resp.selectedOptionIndex : null;

    let isCorrect = false;
    if (selectedOptionIndex === null) {
      emBranco += 1;
    } else if (selectedOptionIndex === q.correctIndex) {
      isCorrect = true;
      acertos += 1;
    } else {
      erros += 1;
    }

    // Inicializa contador por categoria se não existir
    if (!detalhesPorCategoria[q.category]) {
      detalhesPorCategoria[q.category] = {
        total: 0,
        acertos: 0,
        taxa: 0,
      };
    }

    detalhesPorCategoria[q.category].total += 1;
    if (isCorrect) {
      detalhesPorCategoria[q.category].acertos += 1;
    }

    return {
      perguntaId: q.id,
      selectedOptionIndex,
      isCorrect,
    };
  });

  // Calcula taxa de cada categoria
  for (const cat of Object.keys(detalhesPorCategoria) as CategoryType[]) {
    const item = detalhesPorCategoria[cat];
    item.taxa = item.total > 0 ? Math.round((item.acertos / item.total) * 100) : 0;
  }

  const totalQuestoes = questoes.length;
  const pontuacaoPercentual = totalQuestoes > 0 ? Math.round((acertos / totalQuestoes) * 100) : 0;

  return {
    id: `sim-${Date.now()}`,
    titulo: config.titulo,
    dataHora: Date.now(),
    tempoTotalGastoSegundos,
    duracaoTotalSegundos: config.duracaoMinutos * 60,
    totalQuestoes,
    acertos,
    erros,
    emBranco,
    pontuacaoPercentual,
    detalhesPorCategoria,
    respostas: respostasFormatadas,
  };
}

/**
 * Retorna o diagnóstico verbal com base na nota do simulado.
 */
export function obterDiagnosticoSimulado(pontuacaoPercentual: number): {
  classificacao: 'Excelente' | 'Aprovado' | 'Alerta' | 'Crítico';
  mensagem: string;
  cor: string;
} {
  if (pontuacaoPercentual >= 85) {
    return {
      classificacao: 'Excelente',
      mensagem: 'Desempenho de topo de lista! Você está dominando o perfil da banca VUNESP.',
      cor: '#10B981',
    };
  }
  if (pontuacaoPercentual >= 70) {
    return {
      classificacao: 'Aprovado',
      mensagem: 'Dentro da zona de corte! Revise os pontos fracos apontados para garantir a vaga.',
      cor: '#3B82F6',
    };
  }
  if (pontuacaoPercentual >= 50) {
    return {
      classificacao: 'Alerta',
      mensagem: 'Atenção às pegadinhas da banca! Intensifique a Fila do Dia nas matérias com taxa < 70%.',
      cor: '#F59E0B',
    };
  }
  return {
    classificacao: 'Crítico',
    mensagem: 'Zona de perigo! Priorize o estudo dos conceitos básicos e o Banco de Erros imediatamente.',
    cor: '#EF4444',
  };
}

