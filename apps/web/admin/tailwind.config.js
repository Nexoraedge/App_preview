/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1D2D50',
          50: '#F0F4FA',
          100: '#D9E3F3',
          800: '#15213C',
          900: '#1D2D50',
        },
        action: {
          DEFAULT: '#3A7BD5',
          hover: '#2967BE',
          light: '#EBF2FC',
        },
        healthGreen: {
          DEFAULT: '#124D41',
          light: '#1B6C5C',
          dark: '#0B332B',
        },
        mint: {
          DEFAULT: '#CFF7EA',
          soft: '#E8FAF4',
        },
        surface: {
          bg: '#F7F9FB',
          card: '#FFFFFF',
          border: '#E2E8F0',
        },
      },
      fontFamily: {
        header: ['Juana', 'Playfair Display', 'Georgia', 'serif'],
        body: ['Montserrat', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
