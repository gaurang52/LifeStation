// LifeStation Brand Color Theme
export const colors = {
  // Primary Brand Colors
  primary: '#C2185B', // Magenta / Deep Pink - Primary brand color
  lightPrimary: 'rgba(194, 24, 91, 0.5)', // Light version of primary for backgrounds
  white: '#FFFFFF', // White for backgrounds and cards
  black: '#000000', // Fallback black

  // Text Colors
  text: '#1A1A1A', // Primary dark text (fallback to #000000)
  textSecondary: '#888888', // Secondary text, helper text, placeholders
  label: '#1A1A1A', // Form labels
  value: '#1A1A1A', // Value text (same as primary text)

  // Background & Neutral Colors
  background: '#FFFFFF', // Main page backgrounds
  surface: '#FFFFFF', // Cards and containers
  lightGray: '#F5F5F5', // Section backgrounds, disabled containers, table headers
  midGray: '#888888', // Secondary text, helper text, placeholders

  // Semantic Colors (maintained for compatibility)
  success: '#22C55E',
  warning: '#FF8F3A',
  error: '#DC2626', // Better contrast red
  errorBackground: '#fef2f2', // Light red background for error containers
  green: '#22C55E',
  red: '#DC2626',

  // UI Element Colors
  border: '#E5E5E5', // Borders (lighter for better contrast)
  divider: '#E5E5E5', // Dividers
  placeholder: '#888888', // Input placeholders
  icon: '#888888', // Icons (using mid gray)

  // Legacy colors (mapped to new theme for backward compatibility)
  secondary: '#1A1A1A',
  button: '#C2185B', // Primary button color
  tabBg: 'rgba(194, 24, 91, 0.12)', // Tab background with primary color
  outlineButtonBg: '#F5F5F5', // Outline button background
  btnBorder: '#E5E5E5',
  checkBoxBg: '#C2185B', // Checkbox background
  textForgot: '#1A1A1A',
  card: '#F5F5F5',
  bgTab: '#1A1A1A',

  // Functional colors (kept for specific use cases)
  blue: '#3B82F6',
  darkBlue: '#1E40AF',
  orange: '#FF8F3A',
  star: '#FF8F3A',
  battery: '#16A34A',
  lightYellow: '#CA8A04',
  unFilledStar: '#E5E5E5',
  carBg: '#F5F5F5',
  purple: '#9333EA',
  crossBg: '#1A1A1A',
  badgeBg: '#3B82F6',
  footSteps: '#2563EB',
  search: '#1A1A1A',
  gray: '#888888',

  // Device-specific colors
  deivceId: {
    text: '#15803D',
    bg: '#f0fdf4',
  },

  // Legacy card colors
  visaCard: {
    primary: '#1A1A1A',
    secondary: '#1A1A1A',
    gray: '#888888',
    gray2: '#F5F5F5',
  },
};

export type Colors = typeof colors;
