import type { QuestionFilters } from '../services/filterEngine';

/**
 * Filtros padrão para carregamento e limpeza.
 * Configurados com 'all' para garantir que todo o banco de questões
 * esteja visível no início, evitando telas vazias.
 */
export const DEFAULT_FILTERS: QuestionFilters = {
  category: 'all',
  materia: 'all',
  subtopic: 'all',
  dificuldade: 'all',
  statusEstudo: 'todas',
  termoBusca: '',
  banca: 'all',
  orgao: 'all',
  prova: 'all',
  cargo: 'all',
  cidade: 'all',
  ano: 'all',
};

/**
 * Verifica se os filtros atuais são os padrões (sem filtros restritivos ativos).
 */
export function isDefaultFilters(filters: QuestionFilters): boolean {
  return (
    (!filters.category || filters.category === 'all') &&
    (!filters.materia || filters.materia === 'all') &&
    (!filters.subtopic || filters.subtopic === 'all') &&
    (!filters.dificuldade || filters.dificuldade === 'all') &&
    (!filters.statusEstudo || filters.statusEstudo === 'todas') &&
    (!filters.termoBusca || filters.termoBusca.trim() === '') &&
    (!filters.banca || filters.banca === 'all') &&
    (!filters.orgao || filters.orgao === 'all') &&
    (!filters.prova || filters.prova === 'all') &&
    (!filters.cargo || filters.cargo === 'all') &&
    (!filters.cidade || filters.cidade === 'all') &&
    (!filters.ano || filters.ano === 'all')
  );
}

