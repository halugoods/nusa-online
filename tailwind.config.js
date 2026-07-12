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
      },
    },
  },
  plugins: [],
};
