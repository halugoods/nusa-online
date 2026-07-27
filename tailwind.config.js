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
        primary: { DEFAULT: '#E63946', dark: '#C1121F', soft: '#FDE8EA' },
        surface: '#FFFFFF',
        background: '#F7F7F9',
        dark: {
          surface: '#1E1E2E',
          surface2: '#2A2A3C',
          text: '#E4E4E7',
          textSecondary: '#A1A1AA',
          border: '#3F3F46',
        },
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
