/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        portal: {
          bg:           '#080001',
          card:         '#100003',
          hover:        '#1a0005',
          red:          '#CC0000',
          'red-dark':   '#aa0000',
          gold:         '#C9A84C',
          'gold-light': '#e0c068',
          text:         '#f0f0f0',
          muted:        '#a09090',
        },
      },
      fontFamily: {
        sans:    ['Poppins', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
