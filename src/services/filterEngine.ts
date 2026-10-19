import type { Question, CategoryType, Dificuldade, UserStats, RevisaoSRS } from '../types/schema';

export interface QuestionFilters {
  category?: CategoryType | 'all';
  materia?: string | 'all';
  banca?: string | 'all';
  cargo?: string | 'all';
  prova?: string | 'all';
  subtopic?: string | 'all';
  dificuldade?: Dificuldade | 'all';
  statusEstudo?: 'todas' | 'erros' | 'pontos_cegos' | 'pendentes_srs' | 'dominadas';
  termoBusca?: string;
}

/**
 * Filtra as questões com base em múltiplos critérios táticos.
 */
export function filtrarQuestoes(
  questoes: Question[],
  filtros: QuestionFilters,
  stats: UserStats,
  srsMap: Record<string, RevisaoSRS> = {},
  dataReferencia: number = Date.now()
): Question[] {
  // Cria Sets para lookup O(1) se filtrando por erros ou pontos cegos
  const errorSet = filtros.statusEstudo === 'erros' ? new Set(stats.errorQueue || []) : null;
  const blindSpotSet = filtros.statusEstudo === 'pontos_cegos' ? new Set(stats.blindSpotQueue || []) : null;

  return questoes.filter((q) => {
    // 1. Categoria
    if (filtros.category && filtros.category !== 'all') {
      if (q.category !== filtros.category) return false;
    }

    // 2. Matéria
    if (filtros.materia && filtros.materia !== 'all') {
      if (q.materia !== filtros.materia) return false;
    }

    // Registros sem o metadado não pertencem ao concurso/cargo/banca selecionado.
    if (filtros.banca && filtros.banca !== 'all' && q.banca !== filtros.banca) return false;
    if (filtros.cargo && filtros.cargo !== 'all' && q.cargo !== filtros.cargo) return false;
    if (filtros.prova && filtros.prova !== 'all' && q.prova !== filtros.prova) return false;

    // 3. Subtópico
    if (filtros.subtopic && filtros.subtopic !== 'all') {
      if (q.subtopic !== filtros.subtopic) return false;
    }

    // 4. Dificuldade
    if (filtros.dificuldade && filtros.dificuldade !== 'all') {
      if (q.difficulty !== filtros.dificuldade) return false;
    }

    // 5. Termo de Busca (enunciado, raioX ou opções)
    if (filtros.termoBusca && filtros.termoBusca.trim() !== '') {
      const termo = filtros.termoBusca.trim().toLowerCase();
      const bateEnunciado = q.statement.toLowerCase().includes(termo);
      const bateRaioX = q.raioX.toLowerCase().includes(termo);
      const bateSubtopico = q.subtopic.toLowerCase().includes(termo);
      const bateOpcoes = q.options.some((opt) => opt.toLowerCase().includes(termo));
      if (!bateEnunciado && !bateRaioX && !bateSubtopico && !bateOpcoes) {
        return false;
      }
    }

    // 6. Status de Estudo (Banco de Erros, Pontos Cegos, SRS)
    if (filtros.statusEstudo && filtros.statusEstudo !== 'todas') {
      if (filtros.statusEstudo === 'erros') {
        if (!errorSet?.has(q.id)) return false;
      } else if (filtros.statusEstudo === 'pontos_cegos') {
        if (!blindSpotSet?.has(q.id)) return false;
      } else if (filtros.statusEstudo === 'pendentes_srs') {
        const srs = srsMap[q.id];
        if (!srs || srs.proximaRevisao > dataReferencia) return false;
      } else if (filtros.statusEstudo === 'dominadas') {
        const srs = srsMap[q.id];
        if (!srs || srs.status !== 'dominado') return false;
      }
    }

    return true;
  });
}
