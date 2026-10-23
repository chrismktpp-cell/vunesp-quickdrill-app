/**
 * AprovaFox Design System Tokens
 * "Estude esperto. Passe preparado."
 * 
 * Paleta oficial para modo noturno (fonte única de verdade)
 */

export const aprovaFoxColors = {
  // Fundos
  night: '#0B1020',
  nightElevated: '#121A2E',
  surface: '#18223A',
  surfaceHover: '#202D4A',
  surfacePressed: '#293653',
  border: '#293653',
  borderSubtle: 'rgba(170, 182, 211, 0.14)',

  // Tipografia
  text: '#F4F7FF',
  textSecondary: '#AAB6D3',
  textMuted: '#71809F',
  textDisabled: '#4B5873',
  textOnAccent: '#0B1020',

  // Marca
  violet: '#7657F6',
  violetLight: '#9B87FF',
  violetSoft: 'rgba(118, 87, 246, 0.16)',
  violetGlow: 'rgba(118, 87, 246, 0.30)',

  amber: '#FFB547',
  amberLight: '#FFD27A',
  amberSoft: 'rgba(255, 181, 71, 0.16)',

  // Estados
  success: '#42D392',
  successSoft: 'rgba(66, 211, 146, 0.16)',
  successBorder: '#2AAE75',

  info: '#55B8FF',
  infoSoft: 'rgba(85, 184, 255, 0.16)',

  danger: '#FF6B7A',
  dangerSoft: 'rgba(255, 107, 122, 0.16)',
  dangerBorder: '#D95263',

  warning: '#FFB547',
  warningSoft: 'rgba(255, 181, 71, 0.16)',

  // Navegação
  nav: '#0E1629',
  navBorder: '#202D4A',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  block: 16,
  screenPadding: 16,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
  control: 12,
  card: 16,
} as const;

export const typography = {
  caption: 12,
  body: 15,
  label: 13,
  title: 22,
  display: 30,
  statement: 17,

  // Line heights
  captionLineHeight: 16,
  bodyLineHeight: 22,
  labelLineHeight: 18,
  titleLineHeight: 28,
  displayLineHeight: 36,
  statementLineHeight: 26,
} as const;

export const weights = {
  normal: '400' as const,
  body: '400' as const,
  meta: '500' as const,
  title: '700' as const,
  display: '800' as const,
} as const;

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 4,
  },
  accent: {
    shadowColor: '#7657F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.30,
    shadowRadius: 28,
    elevation: 6,
  },
  amberAccent: {
    shadowColor: '#FFB547',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 4,
  },
};

/**
 * Cores temáticas do AprovaFox com mapeamento completo para ThemeColors
 */
export const aprovaFoxTheme = {
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
