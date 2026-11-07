/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        luxury: {
          bg: '#FAF8F5',
          surface: '#FFFFFF',
          header: '#0B0B0B',
          card: '#FFFFFF',
          'card-subtle': '#F5F2ED',
          charcoal: '#181617',
          text: '#221F20',
          muted: '#7A7275',
          'muted-light': '#A8A0A3',
          border: '#E8E2D9',
          'border-dark': '#2B2728',
          gold: '#B8975A',
          'gold-light': '#D4AF37',
          'gold-dark': '#8F6E35',
          rose: '#D4A5B0',
          'rose-light': '#FBF3F5',
          'rose-dark': '#B57D8A',
          burgundy: '#6B1E2E',
          'burgundy-dark': '#48131E',
          ivory: '#FAF8F5',
        }
      },
      fontFamily: {
        italiana: ['"Italiana"', 'Georgia', 'serif'],
        bodoni: ['"Bodoni Moda"', '"Playfair Display"', 'Georgia', 'serif'],
        playfair: ['"Playfair Display"', 'Georgia', 'serif'],
        cinzel: ['"Cinzel"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Montserrat', 'system-ui', 'sans-serif'],
        pinyon: ['"Pinyon Script"', 'cursive'],
        display: ['"Cormorant Garamond"', '"Bodoni Moda"', 'Georgia', 'serif'],
        body: ['Manrope', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'luxury-sm': '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 1px 4px -1px rgba(0, 0, 0, 0.03)',
        'luxury-card': '0 10px 30px -10px rgba(0, 0, 0, 0.08), 0 0 1px 1px rgba(0, 0, 0, 0.04)',
        'luxury-hover': '0 20px 40px -15px rgba(0, 0, 0, 0.12), 0 0 1px 1px rgba(184, 151, 90, 0.3)',
        'gold-glow': '0 0 25px rgba(184, 151, 90, 0.25)',
      },
      letterSpacing: {
        'widest-plus': '0.25em',
        'widest-luxury': '0.35em',
      }
    },
  },
  plugins: [],
}
