import type { Question, CategoryType, Dificuldade, UserStats, RevisaoSRS } from '../types/schema';

export interface QuestionFilters {
  category?: CategoryType | 'all';
  materia?: string | 'all';
  subtopic?: string | 'all';
  dificuldade?: Dificuldade | 'all';
  statusEstudo?: 'todas' | 'erros' | 'pontos_cegos' | 'pendentes_srs' | 'dominadas';
  termoBusca?: string;
  banca?: string | 'all';
  orgao?: string | 'all';
  prova?: string | 'all';
  cargo?: string | 'all';
  cidade?: string | 'all';
  ano?: number | 'all';
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
      if (q.materia && q.materia !== filtros.materia) return false;
    }

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

    // 7. Banca / Organizadora
    if (filtros.banca && filtros.banca !== 'all') {
      const qBanca = q.banca || 'VUNESP';
      if (qBanca !== filtros.banca) return false;
    }

    // 8. Órgão
    if (filtros.orgao && filtros.orgao !== 'all') {
      const qOrgao = q.orgao || 'Câmara Municipal de Itanhaém';
      if (qOrgao !== filtros.orgao) return false;
    }

    // 9. Concurso / Prova
    if (filtros.prova && filtros.prova !== 'all') {
      const qProva = q.prova || 'Concurso Câmara de Itanhaém';
      if (qProva !== filtros.prova) return false;
    }

    // 10. Cargo
    if (filtros.cargo && filtros.cargo !== 'all') {
      const qCargo = q.cargo || 'Agente de Segurança Legislativa';
      if (qCargo !== filtros.cargo) return false;
    }

    // 11. Cidade
    if (filtros.cidade && filtros.cidade !== 'all') {
      const qCidade = q.cidade || 'Itanhaém';
      if (qCidade !== filtros.cidade) return false;
    }

    // 12. Ano
    if (filtros.ano && filtros.ano !== 'all') {
      const qAno = q.ano || 2024;
      if (qAno !== filtros.ano) return false;
    }

    return true;
  });
}

