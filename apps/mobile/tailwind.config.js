/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#087F8C',
          primary: '#087F8C',
          hover: '#066873',
          teal: '#12AFA5',
          mint: '#36CDBB',
          soft: '#E8F7F4',
        },
        surface: {
          app: '#F7FBFA',
          card: '#FFFFFF',
          muted: '#F1F5F4',
          border: '#E1EBE8',
        },
        text: {
          primary: '#182F3B',
          secondary: '#617581',
          inverse: '#FFFFFF',
        },
        accent: {
          blue: '#4F6BED',
          'blue-soft': '#EEF2FF',
          violet: '#8B70D6',
          'violet-soft': '#F5F3FF',
          amber: '#E69A43',
          'amber-soft': '#FFF8F0',
          coral: '#E87869',
          'coral-soft': '#FFF1F0',
        },
        status: {
          success: '#21845B',
          error: '#C44747',
        },
      },
      fontFamily: {
        heading: ['Manrope', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        hindi: ['Noto Sans Devanagari', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        control: '12px',
        card: '20px',
        feature: '24px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 2px 10px rgba(24, 47, 59, 0.04)',
        floating: '0 6px 20px rgba(24, 47, 59, 0.08)',
      },
    },
  },
  plugins: [],
};
