/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#fdfbf7',
          100: '#f9f5ec',
          200: '#f1e8d5',
          300: '#e5d5b8',
        },
        espresso: {
          800: '#3c2f2f',
          900: '#2b2121',
        },
        caramel: {
          400: '#d4a373',
          500: '#c5834c',
          600: '#a66a38',
        },
        charcoal: '#333333'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
