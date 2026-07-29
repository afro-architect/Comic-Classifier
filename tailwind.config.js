export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f4f0e6',
        paper2: '#efe9db',
        ink: '#191713',
        ink70: 'rgba(25,23,19,0.70)',
        ink45: 'rgba(25,23,19,0.45)',
        redink: '#b8382a',
      },
      fontFamily: {
        hand: ['Caveat', 'Segoe Script', 'cursive'],
        letter: ['"Patrick Hand"', 'Caveat', 'cursive'],
        sans: ['Archivo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
