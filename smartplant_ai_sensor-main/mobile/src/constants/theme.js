export const Colors = {
  // Dark Luxury Backgrounds
  bg:        '#070a06',
  bg2:       '#0a0f08',
  card:      '#111a0e',
  card2:     '#162012',

  // Gold accent (primary brand)
  gold:      '#c8a96a',
  goldDim:   'rgba(200,169,106,0.12)',
  goldGlow:  'rgba(200,169,106,0.25)',

  // Text (cream palette)
  cream:     '#ede8d8',
  sub:       'rgba(237,232,216,0.45)',
  sub2:      'rgba(237,232,216,0.65)',

  // Semantic accents
  green:     '#22c55e',
  greenDark: '#16a34a',
  greenDim:  'rgba(34,197,94,0.12)',
  blue:      '#3b82f6',
  blueDim:   'rgba(59,130,246,0.12)',
  orange:    '#f59e0b',
  orangeDim: 'rgba(245,158,11,0.12)',
  red:       '#ef4444',
  redDim:    'rgba(239,68,68,0.12)',
  purple:    '#a855f7',
  purpleDim: 'rgba(168,85,247,0.12)',

  // Borders (gold-tinted like web)
  border:    'rgba(200,169,106,0.12)',
  borderDim: 'rgba(200,169,106,0.06)',

  // Backward-compat aliases used throughout screens
  text:      '#ede8d8',
  textSub:   'rgba(237,232,216,0.65)',
  textMuted: 'rgba(237,232,216,0.45)',
  bgCard:    '#111a0e',
  bgCard2:   '#162012',
  shadow:    'rgba(0,0,0,0.5)',
};

export const Typography = {
  xs:   11,
  sm:   12,
  base: 14,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  xxxl: 30,
};

export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
};
