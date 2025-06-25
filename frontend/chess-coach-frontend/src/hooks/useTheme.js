import { useMemo } from 'react';
import { theme, getColor, semanticColors } from '../styles/theme';

/**
 * useTheme Hook
 * Provides easy access to theme values and utility functions
 * 
 * Usage:
 * const { colors, spacing, getThemeColor, isLightColor } = useTheme();
 */
export const useTheme = () => {
  const themeUtils = useMemo(() => ({
    // Direct access to theme object
    ...theme,
    
    // Semantic colors for easier access
    semanticColors,
    
    // Utility functions
    getThemeColor: (colorPath) => getColor(colorPath),
    
    // Helper to get CSS custom property
    getCSSVar: (varName) => `var(--${varName})`,
    
    // Check if a color is light (for determining text color)
    isLightColor: (hex) => {
      if (!hex) return false;
      const color = hex.replace('#', '');
      const r = parseInt(color.substr(0, 2), 16);
      const g = parseInt(color.substr(2, 2), 16);
      const b = parseInt(color.substr(4, 2), 16);
      const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
      return brightness > 155;
    },
    
    // Get move evaluation color
    getMoveEvaluationColor: (evaluation) => {
      const evalColors = {
        'brilliant': theme.colors.evaluation.brilliant,
        'great': theme.colors.evaluation.great,
        'good': theme.colors.evaluation.good,
        'inaccuracy': theme.colors.evaluation.inaccuracy,
        'mistake': theme.colors.evaluation.mistake,
        'blunder': theme.colors.evaluation.blunder,
        'neutral': theme.colors.evaluation.neutral,
      };
      return evalColors[evaluation?.toLowerCase()] || evalColors.neutral;
    },
    
    // Get move evaluation class name
    getMoveEvaluationClass: (evaluation) => {
      const evalClasses = {
        'brilliant': 'move-brilliant',
        'great': 'move-great',
        'good': 'move-good',
        'inaccuracy': 'move-inaccuracy',
        'mistake': 'move-mistake',
        'blunder': 'move-blunder',
        'neutral': 'move-neutral',
      };
      return evalClasses[evaluation?.toLowerCase()] || evalClasses.neutral;
    },
    
    // Responsive breakpoint helpers
    breakpoints: {
      isMobile: () => window.innerWidth < 640,
      isTablet: () => window.innerWidth >= 640 && window.innerWidth < 1024,
      isDesktop: () => window.innerWidth >= 1024,
    },
    
    // Animation helpers
    animation: {
      // Create CSS transition string
      transition: (properties = ['all'], duration = 200, easing = 'ease-out') => {
        const props = Array.isArray(properties) ? properties.join(', ') : properties;
        return `${props} ${duration}ms ${easing}`;
      },
      
      // Common durations
      durations: theme.duration,
      
      // Common easing functions
      easing: theme.easing,
    },
    
    // Spacing helpers
    spacing: {
      ...theme.spacing,
      // Get spacing as rem value
      rem: (size) => theme.spacing[size],
      // Get spacing as CSS variable
      var: (size) => `var(--spacing-${size})`,
    },
    
    // Shadow helpers
    shadows: {
      ...theme.boxShadow,
      // Get shadow as CSS variable
      var: (shadow) => `var(--shadow-${shadow})`,
    }
  }), []);

  return themeUtils;
};

/**
 * useResponsive Hook
 * Provides responsive breakpoint utilities
 */
export const useResponsive = () => {
  return useMemo(() => ({
    isMobile: window.innerWidth < 640,
    isTablet: window.innerWidth >= 640 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024,
    isLarge: window.innerWidth >= 1280,
  }), []);
};

/**
 * useChessColors Hook
 * Provides chess-specific color utilities
 */
export const useChessColors = () => {
  return useMemo(() => ({
    // Board colors
    board: {
      light: theme.colors.board.light,
      dark: theme.colors.board.dark,
      highlight: theme.colors.board.highlight,
      check: theme.colors.board.check,
    },
    
    // Move evaluation colors
    evaluation: theme.colors.evaluation,
    
    // Get color by move accuracy
    getAccuracyColor: (accuracy) => {
      if (accuracy >= 95) return theme.colors.evaluation.brilliant;
      if (accuracy >= 90) return theme.colors.evaluation.great;
      if (accuracy >= 85) return theme.colors.evaluation.good;
      if (accuracy >= 75) return theme.colors.evaluation.inaccuracy;
      if (accuracy >= 60) return theme.colors.evaluation.mistake;
      return theme.colors.evaluation.blunder;
    },
    
    // Get piece colors for theming
    pieces: {
      white: theme.colors.neutral.white,
      black: theme.colors.neutral.black,
    }
  }), []);
};

export default useTheme; 