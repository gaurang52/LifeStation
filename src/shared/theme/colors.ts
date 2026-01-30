// LifeStation Brand Color Theme — PMS colors only (per brand guidelines)
// PRIMARY: PMS 675 | SECONDARY: PMS 676, PMS 649 | TAGLINE (logo): PMS 7540

const PMS_675 = '#B42472'; // Primary (RGB 180, 36, 114)
const PMS_676 = '#960051'; // Secondary — darker magenta
const PMS_649 = '#DBE2E9'; // Secondary — light gray-blue
const PMS_7540 = '#4B4F54'; // Tagline of logo (ECS/MAS), dark grey

export const colors = {
  // Primary — PMS 675
  primary: PMS_675,
  lightPrimary: 'rgba(180, 36, 114, 0.5)',
  white: '#FFFFFF',
  whiteOpacity20: 'rgba(255, 255, 255, 0.2)', // For semi-transparent white backgrounds
  black: '#000000',

  // Secondary — PMS 676, PMS 649
  secondary: PMS_676,
  secondaryLight: PMS_649,

  // Tagline (logo) — PMS 7540
  tagline: PMS_7540,

  // Text (using brand neutrals)
  text: PMS_7540,
  textSecondary: PMS_7540,
  label: PMS_7540,
  value: PMS_7540,

  // Background & surfaces
  background: '#FFFFFF',
  surface: '#FFFFFF',
  welcomeBg: '#FFFFFF', // Light bg so logo shows in original colors (LifeStationLogo.png)
  welcomeRingBorder: 'rgba(180, 36, 114, 0.2)',
  welcomeRingBg: 'rgba(180, 36, 114, 0.04)',
  lightGray: PMS_649,
  midGray: PMS_7540,

  // Semantic (minimal; use primary/secondary where possible)
  success: PMS_675,
  successBackground: '#ecfdf5', // Light green success background
  warning: PMS_676,
  warningBackground: '#fffbeb', // Light yellow warning background
  error: PMS_676,
  errorBackground: 'rgba(150, 0, 81, 0.1)',
  green: PMS_675,
  red: PMS_676,

  // UI elements
  border: PMS_649,
  divider: PMS_649,
  placeholder: PMS_7540,
  icon: PMS_7540,

  // Buttons & tabs (primary = PMS 675)
  button: PMS_675,
  tabBg: 'rgba(180, 36, 114, 0.12)',
  outlineButtonBg: PMS_649,
  btnBorder: PMS_649,
  checkBoxBg: PMS_675,
  textForgot: PMS_7540,
  card: PMS_649,
  bgTab: PMS_7540,

  // Functional
  blue: PMS_649,
  darkBlue: PMS_676,
  orange: PMS_676,
  star: PMS_676,
  battery: PMS_675,
  lightYellow: PMS_649,
  unFilledStar: PMS_649,
  carBg: PMS_649,
  purple: PMS_676,
  crossBg: PMS_7540,
  badgeBg: PMS_675,
  footSteps: PMS_676,
  search: PMS_7540,
  gray: PMS_7540,

  // Device-specific
  deivceId: {
    text: PMS_675,
    bg: 'rgba(180, 36, 114, 0.08)',
  },

  // Legacy card
  visaCard: {
    primary: PMS_7540,
    secondary: PMS_7540,
    gray: PMS_7540,
    gray2: PMS_649,
  },
};

export type Colors = typeof colors;
