/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand colors
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
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
} 