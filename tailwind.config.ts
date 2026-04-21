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
        // V16.4 Glassmorphic Theme Colors
        navy:    '#0D1B3E',
        bg:      '#030912',
        surface: 'rgba(6, 13, 26, 0.95)',
        
        teal: {
          DEFAULT: '#0E7C7B',
          hi:      'rgba(14, 200, 198, 1)',
          glow:    'rgba(14, 124, 123, 0.55)',
        },
        gold: {
          DEFAULT: '#C9A84C',
          hi:      'rgba(255, 210, 100, 1)',
          glow:    'rgba(201, 168, 76, 0.5)',
        },
        red: {
          DEFAULT: 'rgba(220, 75, 55, 0.85)',
          glow:    'rgba(220, 75, 55, 0.45)',
        },
        green: {
          DEFAULT: '#1EA550',
          glow:    'rgba(30, 165, 80, 0.5)',
        },
        purple: 'rgba(100, 50, 180, 0.7)',
        
        // Legacy colors
        lgray:   '#F2F4F8',
        mgray:   '#D0D5DD',
        success: '#1A7A4A',
        danger:  '#C0392B',
        warning: '#E67E22',
      },
      fontFamily: {
        sans: ['Rajdhani', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Syncopate', 'sans-serif'],
        mono: ['DM Mono', 'Courier New', 'monospace'],
      },
      backgroundImage: {
        'glass': 'linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 50%, rgba(0,5,20,0.4) 100%)',
        'glass-border': 'rgba(255, 255, 255, 0.11)',
      },
      boxShadow: {
        'glass': '0 20px 60px rgba(0,0,0,0.72), 0 4px 16px rgba(0,0,0,0.5)',
        'teal-glow': '0 0 30px rgba(14, 124, 123, 0.1)',
        'gold-glow': '0 0 28px rgba(201, 168, 76, 0.1)',
      },
      backdropBlur: {
        'glass': '40px',
      },
      // WCAG 2.5.8: Target Size — enforce 44px minimum in design system
      minHeight: { touch: '2.75rem' },
      minWidth:  { touch: '2.75rem' },
    },
  },
  plugins: [],
};

export default config;
