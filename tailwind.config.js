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
        primary: { DEFAULT: '#E40000', dark: '#B80000', soft: '#FFE5E6' },
        surface: '#FFFFFF',
        background: '#F7F7F9',
        text: { primary: '#1F2937', secondary: '#6B7280', tertiary: '#9CA3AF' },
        divider: '#E5E7EB',
        border: '#F3F4F6',
        'input-fill': '#F9FAFB',
        success: { DEFAULT: '#10B981', soft: '#D1FAE5', text: '#065F46' },
        error: { DEFAULT: '#EF4444', soft: '#FEE2E2', text: '#DC2626' },
        warning: { DEFAULT: '#F59E0B', soft: '#FEF3C7', text: '#D97706' },
        stock: { active: '#DCFCE7', activeText: '#16A34A', low: '#FEF3C7', lowText: '#D97706', out: '#FEE2E2', outText: '#DC2626' },
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'] },
      borderRadius: { sm: '8px', md: '12px', lg: '16px', xl: '20px', full: '999px' },
      boxShadow: { card: '0 3px 10px rgba(0,0,0,.08)', bar: '0 6px 16px rgba(228,0,0,.35)' },
    },
  },
  plugins: [],
};
