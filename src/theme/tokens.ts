import { aprovaFoxColors, aprovaFoxTheme } from './aprovafox';
export { aprovaFoxColors, aprovaFoxTheme };

export interface ThemeColors {
  // Backgrounds
  bg: string;
  bgSecondary: string;
  cardBg: string;
  cardBgHover: string;
  cardBorder: string;
  cardBorderSubtle: string;

  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Brand & Accents
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primarySoft: string;
  primaryGlow: string;

  // Semantics
  success: string;
  successDark: string;
  successSoft: string;
  successBorder: string;

  warning: string;
  warningDark: string;
  warningSoft: string;
  warningBorder: string;

  danger: string;
  dangerDark: string;
  dangerSoft: string;
  dangerBorder: string;

  purple: string;
  purpleDark: string;
  purpleSoft: string;

  info: string;
  infoSoft: string;

  // Surface & Dividers
  surface: string;
  surfaceSubtle: string;
  divider: string;

  // Tab & Header
  navBg: string;
  navBorder: string;
}

/**
 * Modo Noturno Oficial AprovaFox (Fonte Única de Verdade)
 * #0B1020 + #18223A + #7657F6 + #FFB547
 */
export const darkTheme: ThemeColors = {
  bg: aprovaFoxColors.night,
  bgSecondary: aprovaFoxColors.nightElevated,
  cardBg: aprovaFoxColors.surface,
  cardBgHover: aprovaFoxColors.surfaceHover,
  cardBorder: aprovaFoxColors.border,
  cardBorderSubtle: aprovaFoxColors.borderSubtle,

  textPrimary: aprovaFoxColors.text,
  textSecondary: aprovaFoxColors.textSecondary,
  textMuted: aprovaFoxColors.textMuted,
  textInverse: aprovaFoxColors.textOnAccent,

  primary: aprovaFoxColors.violet,
  primaryLight: aprovaFoxColors.violetLight,
  primaryDark: '#5E3CE3',
  primarySoft: aprovaFoxColors.violetSoft,
  primaryGlow: aprovaFoxColors.violetGlow,

  success: aprovaFoxColors.success,
  successDark: aprovaFoxColors.successBorder,
  successSoft: aprovaFoxColors.successSoft,
  successBorder: aprovaFoxColors.successBorder,

  warning: aprovaFoxColors.amber,
  warningDark: '#E09832',
  warningSoft: aprovaFoxColors.amberSoft,
  warningBorder: aprovaFoxColors.amber,

  danger: aprovaFoxColors.danger,
  dangerDark: aprovaFoxColors.dangerBorder,
  dangerSoft: aprovaFoxColors.dangerSoft,
  dangerBorder: aprovaFoxColors.dangerBorder,

  purple: aprovaFoxColors.violet,
  purpleDark: '#5E3CE3',
  purpleSoft: aprovaFoxColors.violetSoft,

  info: aprovaFoxColors.info,
  infoSoft: aprovaFoxColors.infoSoft,

  surface: aprovaFoxColors.surface,
  surfaceSubtle: aprovaFoxColors.nightElevated,
  divider: aprovaFoxColors.border,

  navBg: aprovaFoxColors.nav,
  navBorder: aprovaFoxColors.navBorder,
};

export const lightTheme: ThemeColors = {
  bg: '#f8fafc',
  bgSecondary: '#f1f5f9',
  cardBg: '#ffffff',
  cardBgHover: '#f8fafc',
  cardBorder: '#e2e8f0',
  cardBorderSubtle: '#cbd5e1',

  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  textInverse: '#ffffff',

  primary: '#2563eb',
  primaryLight: '#3b82f6',
  primaryDark: '#1d4ed8',
  primarySoft: 'rgba(37, 99, 235, 0.10)',
  primaryGlow: 'rgba(37, 99, 235, 0.20)',

  success: '#16a34a',
  successDark: '#15803d',
  successSoft: 'rgba(22, 163, 74, 0.10)',
  successBorder: '#16a34a',

  warning: '#f59e0b',
  warningDark: '#d97706',
  warningSoft: 'rgba(245, 158, 11, 0.12)',
  warningBorder: '#f59e0b',

  danger: '#ef4444',
  dangerDark: '#dc2626',
  dangerSoft: 'rgba(239, 68, 68, 0.10)',
  dangerBorder: '#ef4444',

  purple: '#8b5cf6',
  purpleDark: '#6d28d9',
  purpleSoft: 'rgba(139, 92, 246, 0.12)',

  info: '#4f46e5',
  infoSoft: 'rgba(79, 70, 229, 0.10)',

  surface: '#f1f5f9',
  surfaceSubtle: '#f8fafc',
  divider: 'rgba(100, 116, 139, 0.12)',

  navBg: '#ffffff',
  navBorder: '#e2e8f0',
};

export const categoryColors = {
  crase: {
    dark: {
      accent: '#818cf8',
      soft: 'rgba(129, 140, 248, 0.14)',
      border: '#4f46e5',
      badgeText: '#c7d2fe',
    },
    light: {
      accent: '#4f46e5',
      soft: 'rgba(79, 70, 229, 0.10)',
      border: '#818cf8',
      badgeText: '#3730a3',
    },
  },
  sujeito: {
    dark: {
      accent: '#c084fc',
      soft: 'rgba(192, 132, 252, 0.14)',
      border: '#9333ea',
      badgeText: '#f3e8ff',
    },
    light: {
      accent: '#7e22ce',
      soft: 'rgba(126, 34, 206, 0.10)',
      border: '#c084fc',
      badgeText: '#581c87',
    },
  },
  patrimonio: {
    dark: {
      accent: '#2dd4bf',
      soft: 'rgba(45, 212, 191, 0.14)',
      border: '#0d9488',
      badgeText: '#ccfbf1',
    },
    light: {
      accent: '#0f766e',
      soft: 'rgba(15, 118, 110, 0.10)',
      border: '#2dd4bf',
      badgeText: '#115e59',
    },
  },
  licitacao: {
    dark: {
      accent: '#fb923c',
      soft: 'rgba(251, 146, 60, 0.14)',
      border: '#ea580c',
      badgeText: '#ffedd5',
    },
    light: {
      accent: '#c2410c',
      soft: 'rgba(194, 65, 12, 0.10)',
      border: '#fb923c',
      badgeText: '#9a3412',
    },
  },
  matematica: {
    dark: {
      accent: '#38bdf8',
      soft: 'rgba(56, 189, 248, 0.14)',
      border: '#0284c7',
      badgeText: '#bae6fd',
    },
    light: {
      accent: '#0284c7',
      soft: 'rgba(2, 132, 199, 0.10)',
      border: '#38bdf8',
      badgeText: '#0369a1',
    },
  },
};

export const radius = {
  xs: 6,
  chip: 10,
  control: 14,
  card: 18,
  pill: 999,
} as const;

export const typography = {
  caption: 11,
  meta: 12,
  sub: 13,
  body: 15,
  option: 16,
  statement: 17,
  statementLineHeight: 24,
  subtitle: 18,
  title: 20,
  hero: 26,
} as const;

export const weights = {
  normal: '400' as const,
  body: '400' as const,
  meta: '500' as const,
  statement: '600' as const,
  title: '600' as const,
  number: '700' as const,
  black: '800' as const,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  block: 16,
  screenPadding: 16,
  lg: 20,
  xl: 24,
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  tactileButton: (darkBorder: string) => ({
    borderBottomWidth: 3,
    borderBottomColor: darkBorder,
  }),
};
