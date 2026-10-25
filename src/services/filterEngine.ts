import type { Question, CategoryType, Dificuldade, UserStats, RevisaoSRS } from '../types/schema';
import { estaPendenteParaRevisao } from './srsEngine';

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
 * Remove diacríticos/acentos e converte para minúsculas para comparação uniforme.
 */
export const normalizeText = (s?: string | number | null): string =>
  (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

/**
 * Mapeamento canônico defensivo de Categoria -> Matéria para fallback resiliente.
 */
export const MATERIA_FALLBACK: Record<string, string> = {
  'Crase (VUNESP)': 'Língua Portuguesa',
  'Sujeito Oracional e Transitividade': 'Língua Portuguesa',
  'Gestão de Patrimônio e Bens Públicos': 'Direito Administrativo',
  'Nova Lei de Licitações (Lei 14.133/2021)': 'Direito Administrativo',
  'Língua Portuguesa (Agente Patrimonial)': 'Língua Portuguesa',
  'Matemática e Raciocínio Lógico': 'Matemática e Raciocínio Lógico',
  'Conhecimentos Específicos - Agente Patrimonial': 'Conhecimentos Específicos',
};

/**
 * Compara dois valores com suporte a 'all', undefined e insensibilidade a acentos/caixa,
 * além de equivalência semântica para cargos e órgãos de Itanhaém.
 */
export const matchesFilter = (
  value: string | number | undefined | null,
  selected: string | number | undefined | null
): boolean => {
  if (!selected || selected === 'all') return true;
  if (value === undefined || value === null || value === '') return false;
  const normVal = normalizeText(value);
  const normSel = normalizeText(selected);
  if (normVal === normSel) return true;

  // Equivalência estrita entre "Agente Patrimonial" e "Agente de Vigilância Patrimonial" (Itanhaém)
  const isItanhaemPatrimonialVal =
    normVal === 'agente patrimonial' || normVal === 'agente de vigilancia patrimonial';
  const isItanhaemPatrimonialSel =
    normSel === 'agente patrimonial' || normSel === 'agente de vigilancia patrimonial';
  if (isItanhaemPatrimonialVal && isItanhaemPatrimonialSel) {
    return true;
  }

  return false;
};

/**
 * Filtra as questões com base em múltiplos critérios táticos.
 */
export function filtrarQuestoes(
  questoes: Question[],
  filtros: QuestionFilters,
  stats: UserStats,
  srsMap: Record<string, RevisaoSRS> = stats?.revisoesSRS || {},
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

    // 2. Matéria (com fallback canônico por categoria)
    if (filtros.materia && filtros.materia !== 'all') {
      const matEfetiva = q.materia || MATERIA_FALLBACK[q.category] || 'Conhecimentos Gerais';
      if (!matchesFilter(matEfetiva, filtros.materia)) return false;
    }

    // 3. Subtópico
    if (filtros.subtopic && filtros.subtopic !== 'all') {
      if (!matchesFilter(q.subtopic, filtros.subtopic)) return false;
    }

    // 4. Dificuldade
    if (filtros.dificuldade && filtros.dificuldade !== 'all') {
      if (q.difficulty !== filtros.dificuldade) return false;
    }

    // 5. Termo de Busca (normalizado contra acentos e maiúsculas)
    if (filtros.termoBusca && filtros.termoBusca.trim() !== '') {
      const termoNorm = normalizeText(filtros.termoBusca);
      const bateEnunciado = normalizeText(q.statement).includes(termoNorm);
      const bateRaioX = normalizeText(q.raioX).includes(termoNorm);
      const bateSubtopico = normalizeText(q.subtopic).includes(termoNorm);
      const bateOpcoes = q.options.some((opt) => normalizeText(opt).includes(termoNorm));
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
        if (!estaPendenteParaRevisao(srsMap[q.id], dataReferencia)) return false;
      } else if (filtros.statusEstudo === 'dominadas') {
        const srs = srsMap[q.id];
        if (!srs || srs.status !== 'dominado') return false;
      }
    }

    // 7. Banca / Organizadora
    if (filtros.banca && filtros.banca !== 'all') {
      const bancaEfetiva = q.banca || (q.category.includes('VUNESP') ? 'VUNESP' : undefined);
      if (!matchesFilter(bancaEfetiva, filtros.banca)) return false;
    }

    // 8. Órgão
    if (filtros.orgao && filtros.orgao !== 'all') {
      if (!matchesFilter(q.orgao, filtros.orgao)) return false;
    }

    // 9. Concurso / Prova
    if (filtros.prova && filtros.prova !== 'all') {
      if (!matchesFilter(q.prova, filtros.prova)) return false;
    }

    // 10. Cargo (com equivalência para Agente Patrimonial / Agente de Vigilância Patrimonial)
    if (filtros.cargo && filtros.cargo !== 'all') {
      if (!matchesFilter(q.cargo, filtros.cargo)) return false;
    }

    // 11. Cidade
    if (filtros.cidade && filtros.cidade !== 'all') {
      if (!matchesFilter(q.cidade, filtros.cidade)) return false;
    }

    // 12. Ano
    if (filtros.ano && filtros.ano !== 'all') {
      if (!matchesFilter(q.ano, filtros.ano)) return false;
    }

    return true;
  });
}
