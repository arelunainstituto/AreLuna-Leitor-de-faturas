/**
 * Tailwind CSS configuration for local build
 */
module.exports = {
  darkMode: 'class',
  content: [
    './public/**/*.html'
  ],
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
    },
  },
  plugins: [],
};