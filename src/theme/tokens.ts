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
  primarySoft: string;
  primaryGlow: string;

  // Semantics
  success: string;
  successSoft: string;
  successBorder: string;

  warning: string;
  warningSoft: string;
  warningBorder: string;

  danger: string;
  dangerSoft: string;
  dangerBorder: string;

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

export const darkTheme: ThemeColors = {
  bg: '#090d16',
  bgSecondary: '#0f172a',
  cardBg: '#131b2e',
  cardBgHover: '#18233c',
  cardBorder: '#1e293b',
  cardBorderSubtle: '#26344d',

  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  textInverse: '#090d16',

  primary: '#38bdf8',
  primaryLight: '#7dd3fc',
  primarySoft: 'rgba(56, 189, 248, 0.12)',
  primaryGlow: 'rgba(56, 189, 248, 0.25)',

  success: '#10b981',
  successSoft: 'rgba(16, 185, 129, 0.14)',
  successBorder: '#059669',

  warning: '#f59e0b',
  warningSoft: 'rgba(245, 158, 11, 0.14)',
  warningBorder: '#d97706',

  danger: '#f43f5e',
  dangerSoft: 'rgba(244, 63, 94, 0.14)',
  dangerBorder: '#e11d48',

  info: '#6366f1',
  infoSoft: 'rgba(99, 102, 241, 0.14)',

  surface: '#172238',
  surfaceSubtle: '#10192d',
  divider: 'rgba(148, 163, 184, 0.12)',

  navBg: '#0c1322',
  navBorder: '#1a243a',
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

  primary: '#0284c7',
  primaryLight: '#0369a1',
  primarySoft: 'rgba(2, 132, 199, 0.10)',
  primaryGlow: 'rgba(2, 132, 199, 0.20)',

  success: '#059669',
  successSoft: 'rgba(5, 150, 105, 0.10)',
  successBorder: '#10b981',

  warning: '#d97706',
  warningSoft: 'rgba(217, 119, 6, 0.10)',
  warningBorder: '#f59e0b',

  danger: '#e11d48',
  dangerSoft: 'rgba(225, 29, 72, 0.10)',
  dangerBorder: '#f43f5e',

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
};

export const radius = {
  chip: 8,
  control: 12,
  card: 16,
} as const;

export const typography = {
  meta: 12,
  body: 14,
  option: 16,
  statement: 20,
  feedback: 22,
} as const;

export const weights = {
  meta: '500' as const,
  title: '600' as const,
  number: '700' as const,
} as const;

export const spacing = {
  block: 12,
  screenPadding: 16,
} as const;
