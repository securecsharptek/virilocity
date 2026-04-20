import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy:    '#0D1B3E',
        teal:    '#0E7C7B',
        gold:    '#C9A84C',
        lgray:   '#F2F4F8',
        mgray:   '#D0D5DD',
        success: '#1A7A4A',
        danger:  '#C0392B',
        warning: '#E67E22',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // WCAG 2.5.8: Target Size — enforce 44px minimum in design system
      minHeight: { touch: '2.75rem' },
      minWidth:  { touch: '2.75rem' },
    },
  },
  plugins: [],
};

export default config;
