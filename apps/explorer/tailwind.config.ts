import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import tailwindcssAnimate from 'tailwindcss-animate';

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

        // Tints — solid OKLCH badge/surface backgrounds (no opacity)
        tint: {
          'cyan-bg': 'var(--color-cyan-tint-bg)',
          'cyan-border': 'var(--color-cyan-tint-border)',
          'cyan-dim-bg': 'var(--color-cyan-dim-tint-bg)',
          'cyan-dim-border': 'var(--color-cyan-dim-tint-border)',
          'stable-bg': 'var(--color-stable-tint-bg)',
          'stable-border': 'var(--color-stable-tint-border)',
          'beta-bg': 'var(--color-beta-tint-bg)',
          'beta-border': 'var(--color-beta-tint-border)',
          'crimson-bg': 'var(--color-crimson-tint-bg)',
          'crimson-border': 'var(--color-crimson-tint-border)',
        },

        // shadcn/ui semantic tokens (aliased to OKLCH system)
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        input: 'var(--input)',
        ring: 'var(--ring)',

        // SprawlOS — dashboard design system tokens
        sprawl: {
          'grid-line': 'var(--color-grid-line)',
          'glow-cyan': 'var(--color-glow-cyan)',
          'glow-crimson': 'var(--color-glow-crimson)',
          'surface-panel': 'var(--color-surface-panel)',
          'node-green': 'var(--color-node-green)',
          'token-yellow': 'var(--color-token-yellow)',
        },
      },
      backgroundImage: {
        'grid-substrate': `repeating-linear-gradient(0deg, var(--color-grid-line) 0px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, var(--color-grid-line) 0px, transparent 1px, transparent 40px)`,
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'var(--radius)',
        sm: 'var(--radius)',
      },
      fontFamily: {
        mono: ['var(--font-geist-mono)', 'monospace'],
        display: ['var(--font-display)', 'Arial Black', 'sans-serif'],
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
        'sprawl-fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'sprawl-scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
        'sprawl-fade-in': 'sprawl-fade-in 83ms steps(4)',
        'sprawl-scale-in': 'sprawl-scale-in 83ms steps(4)',
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
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
