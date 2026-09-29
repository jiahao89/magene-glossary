/**
 * GlossaHub Enterprise Design Tokens - TypeScript Definitions & Utilities
 * Provides type-safe constants, raw OKLCH/Hex mappings, and domain helper functions
 * for HeroUI components, CAT Studio, Diff Engine, and Hardware Gauge widgets.
 */

export const COLOR_SCALES = {
  primary: {
    50: 'oklch(0.975 0.025 45)',
    100: 'oklch(0.935 0.055 45)',
    200: 'oklch(0.875 0.095 44)',
    300: 'oklch(0.805 0.145 43)',
    400: 'oklch(0.740 0.185 42)',
    500: 'oklch(0.680 0.220 42)', // #f97316 Base Primary
    600: 'oklch(0.600 0.210 40)',
    700: 'oklch(0.520 0.190 38)',
    800: 'oklch(0.440 0.160 36)',
    900: 'oklch(0.360 0.130 34)',
    950: 'oklch(0.240 0.090 32)',
  },
  accent: {
    50: 'oklch(0.975 0.028 205)',
    100: 'oklch(0.935 0.060 205)',
    200: 'oklch(0.880 0.095 205)',
    300: 'oklch(0.820 0.130 205)',
    400: 'oklch(0.770 0.150 205)',
    500: 'oklch(0.720 0.160 205)', // #06b6d4 Base Accent
    600: 'oklch(0.630 0.150 205)',
    700: 'oklch(0.550 0.140 205)',
    800: 'oklch(0.460 0.115 205)',
    900: 'oklch(0.380 0.090 205)',
    950: 'oklch(0.250 0.070 205)',
  },
  slate: {
    50: 'oklch(0.985 0.008 250)',
    100: 'oklch(0.960 0.012 250)',
    200: 'oklch(0.920 0.018 250)',
    300: 'oklch(0.860 0.022 250)',
    400: 'oklch(0.700 0.030 250)',
    500: 'oklch(0.550 0.035 250)',
    600: 'oklch(0.440 0.035 250)',
    700: 'oklch(0.360 0.032 250)',
    800: 'oklch(0.270 0.030 255)',
    900: 'oklch(0.180 0.030 260)',
    950: 'oklch(0.120 0.020 260)',
  },
  success: {
    50: 'oklch(0.975 0.028 145)',
    100: 'oklch(0.935 0.060 145)',
    200: 'oklch(0.875 0.095 145)',
    300: 'oklch(0.805 0.140 145)',
    400: 'oklch(0.730 0.175 145)',
    500: 'oklch(0.650 0.200 145)', // #10b981
    600: 'oklch(0.570 0.190 145)',
    700: 'oklch(0.480 0.165 145)',
    800: 'oklch(0.400 0.135 145)',
    900: 'oklch(0.320 0.105 145)',
    950: 'oklch(0.200 0.070 145)',
  },
  warning: {
    50: 'oklch(0.980 0.030 85)',
    100: 'oklch(0.940 0.065 85)',
    200: 'oklch(0.890 0.105 85)',
    300: 'oklch(0.835 0.140 85)',
    400: 'oklch(0.800 0.165 85)',
    500: 'oklch(0.750 0.180 85)', // #f59e0b
    600: 'oklch(0.650 0.170 85)',
    700: 'oklch(0.540 0.155 85)',
    800: 'oklch(0.440 0.130 85)',
    900: 'oklch(0.360 0.105 85)',
    950: 'oklch(0.220 0.070 85)',
  },
  danger: {
    50: 'oklch(0.975 0.030 25)',
    100: 'oklch(0.930 0.065 25)',
    200: 'oklch(0.870 0.110 25)',
    300: 'oklch(0.790 0.165 25)',
    400: 'oklch(0.700 0.210 25)',
    500: 'oklch(0.600 0.240 25)', // #f43f5e
    600: 'oklch(0.520 0.225 25)',
    700: 'oklch(0.440 0.195 25)',
    800: 'oklch(0.360 0.160 25)',
    900: 'oklch(0.290 0.125 25)',
    950: 'oklch(0.180 0.080 25)',
  },
  info: {
    50: 'oklch(0.975 0.025 245)',
    100: 'oklch(0.935 0.055 245)',
    200: 'oklch(0.875 0.090 245)',
    300: 'oklch(0.805 0.130 245)',
    400: 'oklch(0.720 0.160 245)',
    500: 'oklch(0.620 0.180 245)', // #3b82f6
    600: 'oklch(0.530 0.170 245)',
    700: 'oklch(0.440 0.150 245)',
    800: 'oklch(0.360 0.125 245)',
    900: 'oklch(0.280 0.100 245)',
    950: 'oklch(0.180 0.065 245)',
  },
  ai: {
    500: 'oklch(0.620 0.220 295)', // #a855f7
    600: 'oklch(0.530 0.210 295)',
  },
} as const;

export const SPACING_TOKENS = {
  0: '0px',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.50rem',    // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  3.5: '0.875rem', // 14px
  4: '1.00rem',    // 16px
  5: '1.25rem',    // 20px
  6: '1.50rem',    // 24px
  7: '1.75rem',    // 28px
  8: '2.00rem',    // 32px
  10: '2.50rem',   // 40px
  12: '3.00rem',   // 48px
  16: '4.00rem',   // 64px
  20: '5.00rem',   // 80px
  24: '6.00rem',   // 96px
} as const;

export const RADIUS_TOKENS = {
  none: '0px',
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  '3xl': '32px',
  full: '9999px',
} as const;

export const COMPONENT_DIMENSIONS = {
  tableRow: {
    compact: '36px',
    default: '48px',
    relaxed: '64px',
    header: '40px',
  },
  input: {
    sm: '32px',
    md: '40px',
    lg: '48px',
  },
  button: {
    xs: '24px',
    sm: '32px',
    md: '40px',
    lg: '48px',
  },
  chip: {
    xs: '20px',
    sm: '24px',
    md: '32px',
  },
  layout: {
    topbarHeight: '60px',
    sidebarCollapsed: '64px',
    sidebarExpanded: '260px',
    catNavWidth: '320px',
    catDockWidth: '360px',
    auditDrawerWidth: '460px',
  },
  modal: {
    sm: '400px',
    md: '560px',
    lg: '760px',
    xl: '980px',
    '2xl': '1200px',
  },
} as const;

export const Z_INDEX = {
  deep: -1,
  base: 0,
  hover: 1,
  stickyCol: 10,
  stickyHeader: 20,
  dropdown: 100,
  popover: 200,
  drawer: 300,
  backdrop: 400,
  modal: 500,
  toast: 600,
  tooltip: 700,
  max: 9999,
} as const;

export const BREAKPOINTS = {
  xs: '360px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1920px',
} as const;

/* ============================================================================
   Domain Helper Functions for Frontend Developers
   ============================================================================ */

export type DiffType = 'ADD' | 'DEL' | 'MOD' | 'UNCHANGED' | 'FALSE_DIFF' | 'CONFLICT';

export interface DiffBadgeConfig {
  label: string;
  color: 'success' | 'danger' | 'warning' | 'default' | 'secondary';
  bgClass: string;
  borderClass: string;
  textClass: string;
}

export function getDiffBadgeConfig(diffType: DiffType): DiffBadgeConfig {
  switch (diffType) {
    case 'ADD':
      return {
        label: '新增 ADD',
        color: 'success',
        bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/16',
        borderClass: 'border-emerald-500/30 dark:border-emerald-500/35',
        textClass: 'text-emerald-600 dark:text-emerald-400 font-semibold',
      };
    case 'DEL':
      return {
        label: '删除 DEL',
        color: 'danger',
        bgClass: 'bg-rose-500/10 dark:bg-rose-500/18',
        borderClass: 'border-rose-500/30 dark:border-rose-500/40',
        textClass: 'text-rose-600 dark:text-rose-400 line-through',
      };
    case 'MOD':
      return {
        label: '修改 MOD',
        color: 'warning',
        bgClass: 'bg-amber-500/10 dark:bg-amber-500/16',
        borderClass: 'border-amber-500/30 dark:border-amber-500/40',
        textClass: 'text-amber-600 dark:text-amber-400 font-semibold',
      };
    case 'FALSE_DIFF':
      return {
        label: '已规范化 (假差异)',
        color: 'default',
        bgClass: 'bg-slate-200/50 dark:bg-slate-800/50',
        borderClass: 'border-slate-300 dark:border-slate-700',
        textClass: 'text-slate-500 dark:text-slate-400 italic',
      };
    case 'CONFLICT':
      return {
        label: '版本冲突 CONFLICT',
        color: 'danger',
        bgClass: 'bg-rose-600/20 dark:bg-rose-600/30',
        borderClass: 'border-rose-600 dark:border-rose-500',
        textClass: 'text-rose-700 dark:text-rose-300 font-bold',
      };
    case 'UNCHANGED':
    default:
      return {
        label: '无变动',
        color: 'default',
        bgClass: 'bg-transparent',
        borderClass: 'border-transparent',
        textClass: 'text-slate-400 dark:text-slate-500',
      };
  }
}

export type HardwareGaugeState = 'safe' | 'warning' | 'danger';

export interface HardwareGaugeResult {
  state: HardwareGaugeState;
  color: 'success' | 'warning' | 'danger';
  percentage: number;
  isOverflow: boolean;
  delta: number;
  textClass: string;
  meterTrackClass: string;
}

export function evaluateHardwareGauge(currentLength: number, maxChars: number): HardwareGaugeResult {
  if (!maxChars || maxChars <= 0) {
    return {
      state: 'safe',
      color: 'success',
      percentage: 0,
      isOverflow: false,
      delta: 0,
      textClass: 'text-slate-400',
      meterTrackClass: 'bg-slate-200 dark:bg-slate-800',
    };
  }

  const percentage = Math.round((currentLength / maxChars) * 100);
  const isOverflow = currentLength > maxChars;
  const isWarning = percentage >= 70 && !isOverflow;

  if (isOverflow) {
    return {
      state: 'danger',
      color: 'danger',
      percentage: Math.min(percentage, 150),
      isOverflow: true,
      delta: currentLength - maxChars,
      textClass: 'text-rose-500 dark:text-rose-400 font-bold animate-pulse',
      meterTrackClass: 'bg-rose-950/40',
    };
  }

  if (isWarning) {
    return {
      state: 'warning',
      color: 'warning',
      percentage,
      isOverflow: false,
      delta: 0,
      textClass: 'text-amber-600 dark:text-amber-400 font-medium',
      meterTrackClass: 'bg-amber-950/30',
    };
  }

  return {
    state: 'safe',
    color: 'success',
    percentage,
    isOverflow: false,
    delta: 0,
    textClass: 'text-slate-500 dark:text-slate-400',
    meterTrackClass: 'bg-slate-200 dark:bg-slate-800',
  };
}

export type TranslationSourceType = 'human' | 'ai' | 'tm' | 'inherited';

export interface SourceBadgeConfig {
  label: string;
  color: 'primary' | 'secondary' | 'success' | 'default';
  icon: string;
}

export function getSourceBadgeConfig(source: TranslationSourceType): SourceBadgeConfig {
  switch (source) {
    case 'tm':
      return { label: 'TM 100%', color: 'success', icon: 'shield-check' };
    case 'ai':
      return { label: 'AI 生成', color: 'secondary', icon: 'sparkles' };
    case 'inherited':
      return { label: '基线继承', color: 'default', icon: 'git-fork' };
    case 'human':
    default:
      return { label: '人工确审', color: 'primary', icon: 'user-check' };
  }
}
