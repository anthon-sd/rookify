/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2D3E50', // Rook Blue
        },
        accent: {
          gold: '#F4C95D', // Accent Gold
        },
        secondary: {
          cream: '#F5F5F1', // Pawn Cream
          slate: '#697C86', // Knight Slate
          teal: '#36B1A1', // Tactic Teal
        },
        neutral: {
          black: '#1A1A1A', // King Black
          gray: '#D1D5DB', // Rook Gray
          ghost: '#FAFAFA', // Ghost White
        },
      },
    },
  },
  plugins: [],
} 