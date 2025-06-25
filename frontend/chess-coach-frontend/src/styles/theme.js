/**
 * Rookify Theme Configuration
 * Centralized theme system for consistent branding across the application
 */

export const theme = {
  // Primary brand colors
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe', 
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#1E3A8A', // Main primary - Deep blue
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      DEFAULT: '#1E3A8A',
    },
    
    // Accent colors
    accent: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a', 
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#F59E0B', // Warm gold
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      DEFAULT: '#F59E0B',
    },
    
    // Success colors
    success: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10B981', // Emerald
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
      DEFAULT: '#10B981',
    },
    
    // Warning colors  
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d', 
      400: '#fbbf24',
      500: '#F59E0B', // Amber
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      DEFAULT: '#F59E0B',
    },
    
    // Error colors
    error: {
      50: '#fdf2f8',
      100: '#fce7f3',
      200: '#fbcfe8',
      300: '#f9a8d4',
      400: '#f472b6',
      500: '#F43F5E', // Rose
      600: '#e11d48',
      700: '#be185d',
      800: '#9d174d',
      900: '#831843',
      DEFAULT: '#F43F5E',
    },
    
    // Chess-themed secondary colors
    secondary: {
      cream: '#F5F5F1', // Pawn Cream - light squares
      slate: '#697C86', // Knight Slate - piece color
      teal: '#36B1A1', // Tactic Teal - highlights
      DEFAULT: '#697C86',
    },
    
    // Neutral colors
    neutral: {
      white: '#FAFAFA', // Ghost White
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#1A1A1A', // King Black
      black: '#1A1A1A',
      DEFAULT: '#71717a',
    },
    
    // Chess board colors
    board: {
      light: '#F0D9B5', // Light squares
      dark: '#B58863', // Dark squares
      highlight: '#F7EC74', // Move highlights
      check: '#FF6B6B', // Check indicator
    },
    
    // Move evaluation colors
    evaluation: {
      brilliant: '#9F7AEA', // Purple
      great: '#38A169', // Green
      good: '#3182CE', // Blue  
      inaccuracy: '#ECC94B', // Yellow
      mistake: '#ED8936', // Orange
      blunder: '#E53E3E', // Red
      neutral: '#A0AEC0', // Gray
    }
  },

  // Typography
  fonts: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    display: ['Poppins', 'Inter', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
  },

  // Font sizes
  fontSize: {
    '2xs': '0.625rem',
    'xs': '0.75rem',
    'sm': '0.875rem',
    'base': '1rem',
    'lg': '1.125rem',
    'xl': '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
  },

  // Spacing scale
  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    18: '4.5rem',
    20: '5rem',
    24: '6rem',
    32: '8rem',
    40: '10rem',
    48: '12rem',
    56: '14rem',
    64: '16rem',
    88: '22rem',
  },

  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    '4xl': '2rem',
    full: '9999px',
  },

  // Box shadows
  boxShadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    soft: '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
    card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    none: 'none',
  },

  // Z-index scale
  zIndex: {
    auto: 'auto',
    0: 0,
    10: 10,
    20: 20,
    30: 30,
    40: 40,
    50: 50,
    modal: 1000,
    popover: 1010,
    tooltip: 1020,
    toast: 1030,
  },

  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Animation durations
  duration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },

  // Animation timing functions
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  }
};

// Helper functions for accessing theme values
export const getColor = (colorPath) => {
  const paths = colorPath.split('.');
  let value = theme.colors;
  
  for (const path of paths) {
    value = value[path];
    if (!value) return null;
  }
  
  return value.DEFAULT || value;
};

// Get semantic colors for different UI states
export const semanticColors = {
  // Text colors
  text: {
    primary: theme.colors.neutral[900],
    secondary: theme.colors.neutral[600],
    muted: theme.colors.neutral[500],
    inverse: theme.colors.neutral.white,
    link: theme.colors.primary.DEFAULT,
    linkHover: theme.colors.primary[700],
  },
  
  // Background colors
  background: {
    primary: theme.colors.neutral.white,
    secondary: theme.colors.neutral[50],
    muted: theme.colors.neutral[100],
    inverse: theme.colors.neutral[900],
    accent: theme.colors.primary[50],
  },
  
  // Border colors
  border: {
    primary: theme.colors.neutral[200],
    secondary: theme.colors.neutral[300],
    accent: theme.colors.primary[300],
    focus: theme.colors.primary.DEFAULT,
  },
  
  // Interactive states
  interactive: {
    primary: theme.colors.primary.DEFAULT,
    primaryHover: theme.colors.primary[700],
    primaryActive: theme.colors.primary[800],
    primaryDisabled: theme.colors.neutral[300],
    
    secondary: theme.colors.neutral[100],
    secondaryHover: theme.colors.neutral[200],
    secondaryActive: theme.colors.neutral[300],
    
    accent: theme.colors.accent.DEFAULT,
    accentHover: theme.colors.accent[600],
    accentActive: theme.colors.accent[700],
  },
  
  // Feedback colors
  feedback: {
    success: theme.colors.success.DEFAULT,
    successBg: theme.colors.success[50],
    successBorder: theme.colors.success[200],
    
    warning: theme.colors.warning.DEFAULT,
    warningBg: theme.colors.warning[50], 
    warningBorder: theme.colors.warning[200],
    
    error: theme.colors.error.DEFAULT,
    errorBg: theme.colors.error[50],
    errorBorder: theme.colors.error[200],
  },
  
  // Chess-specific colors
  chess: {
    // Board
    boardLight: theme.colors.board.light,
    boardDark: theme.colors.board.dark,
    boardHighlight: theme.colors.board.highlight,
    boardCheck: theme.colors.board.check,
    
    // Move evaluations
    brilliant: theme.colors.evaluation.brilliant,
    great: theme.colors.evaluation.great,
    good: theme.colors.evaluation.good,
    inaccuracy: theme.colors.evaluation.inaccuracy,
    mistake: theme.colors.evaluation.mistake,
    blunder: theme.colors.evaluation.blunder,
    neutral: theme.colors.evaluation.neutral,
  }
};

// Generate CSS custom properties
export const generateCSSVariables = () => {
  const flattenObject = (obj, prefix = '') => {
    const result = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}-${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, flattenObject(value, newKey));
      } else {
        result[`--${newKey}`] = Array.isArray(value) ? value.join(', ') : value;
      }
    }
    
    return result;
  };
  
  return flattenObject({
    color: theme.colors,
    fontSize: theme.fontSize,
    spacing: theme.spacing,
    borderRadius: theme.borderRadius,
    boxShadow: theme.boxShadow,
    fontFamily: theme.fonts,
  });
};

export default theme; 