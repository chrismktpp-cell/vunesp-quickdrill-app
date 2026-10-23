import type { CategoryType } from '../types/schema';
import { categoryColors } from './tokens';

export interface CategoryPalette {
  accent: string;
  soft: string;
  border: string;
  badgeText: string;
}

export type ThemeMode = 'dark' | 'light';

/**
 * Mapeamento estático e fortemente tipado de cores por categoria do edital.
 * Substitui estruturas de switch/case propensas a divergências por um Record determinístico.
 */
export const CATEGORY_PALETTES: Record<ThemeMode, Record<CategoryType, CategoryPalette>> = {
  dark: {
    'Crase (VUNESP)': categoryColors.crase.dark,
    'Sujeito Oracional e Transitividade': categoryColors.sujeito.dark,
    'Gestão de Patrimônio e Bens Públicos': categoryColors.patrimonio.dark,
    'Nova Lei de Licitações (Lei 14.133/2021)': categoryColors.licitacao.dark,
    'Língua Portuguesa (Agente Patrimonial)': categoryColors.crase.dark,
    'Matemática e Raciocínio Lógico': categoryColors.matematica.dark,
    'Conhecimentos Específicos - Agente Patrimonial': categoryColors.patrimonio.dark,
  },
  light: {
    'Crase (VUNESP)': categoryColors.crase.light,
    'Sujeito Oracional e Transitividade': categoryColors.sujeito.light,
    'Gestão de Patrimônio e Bens Públicos': categoryColors.patrimonio.light,
    'Nova Lei de Licitações (Lei 14.133/2021)': categoryColors.licitacao.light,
    'Língua Portuguesa (Agente Patrimonial)': categoryColors.crase.light,
    'Matemática e Raciocínio Lógico': categoryColors.matematica.light,
    'Conhecimentos Específicos - Agente Patrimonial': categoryColors.patrimonio.light,
  },
};

/**
 * Retorna a paleta visual associada a uma categoria, com fallback seguro para crase/default.
 */
export function getCategoryColor(
  category: CategoryType,
  isDark: boolean = true
): CategoryPalette {
  const mode: ThemeMode = isDark ? 'dark' : 'light';
  const palette = CATEGORY_PALETTES[mode][category];
  return palette || categoryColors.crase[mode];
}
