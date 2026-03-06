import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic — mapped from OKLCH CSS vars in globals.css
        background: 'var(--color-void-base)',
        surface: 'var(--color-void-raised)',
        border: 'var(--color-void-border)',
        foreground: 'var(--color-bone-base)',

        // Void — the abyss, backgrounds
        void: {
          base: 'var(--color-void-base)',
          raised: 'var(--color-void-raised)',
          surface: 'var(--color-void-surface)',
          border: 'var(--color-void-border)',
        },

        // Bone — primary data, text, interface chrome
        bone: {
          bright: 'var(--color-bone-bright)',
          base: 'var(--color-bone-base)',
          dim: 'var(--color-bone-dim)',
          muted: 'var(--color-bone-muted)',
          ghost: 'var(--color-bone-ghost)',
        },

        // Cyan — structure, chrome, navigation
        cyan: {
          base: 'var(--color-cyan-base)',
          dim: 'var(--color-cyan-dim)',
        },

        // Crimson — accent, danger, emphasis (the ONLY warm channel)
        crimson: {
          base: 'var(--color-crimson-base)',
          dim: 'var(--color-crimson-dim)',
        },

        // Graduation levels
        graduation: {
          experimental: 'var(--graduation-experimental)',
          beta: 'var(--graduation-beta)',
          stable: 'var(--graduation-stable)',
          deprecated: 'var(--graduation-deprecated)',
        },
      },
      fontFamily: {
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      letterSpacing: {
        whisper: 'var(--tracking-whisper)',
        terminal: 'var(--tracking-terminal)',
        emphasis: 'var(--tracking-emphasis)',
        display: 'var(--tracking-display)',
        impact: 'var(--tracking-impact)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      });
    }),
  ],
};

export default config;
