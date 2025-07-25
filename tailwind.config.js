/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./public/**/*.{html,js}",
    "./public/js/**/*.js",
    "./public/ui/**/*.js"
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        '25': 'repeat(25, minmax(0, 1fr))',
      },
      colors: {
        'game-primary': '#3b82f6',
        'game-secondary': '#6b7280',
        'player-1': '#ef4444',
        'player-2': '#10b981',
      }
    },
  },
  plugins: [],
};