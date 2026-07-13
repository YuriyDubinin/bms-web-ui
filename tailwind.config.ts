import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Layered surfaces: 0 — global background, 1 — base panel, 2 — elevated, 3 — overlay/popover.
        bg: {
          0: 'var(--bg-0)',
          1: 'var(--bg-1)',
          2: 'var(--bg-2)',
          3: 'var(--bg-3)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        fg: {
          primary: 'var(--fg-primary)',
          secondary: 'var(--fg-secondary)',
          muted: 'var(--fg-muted)',
          inverse: 'var(--fg-inverse)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
          on: 'var(--accent-on)',
        },
        state: {
          'success': 'var(--state-success)',
          'success-muted': 'var(--state-success-muted)',
          'error': 'var(--state-error)',
          'error-muted': 'var(--state-error-muted)',
          'warning': 'var(--state-warning)',
          'warning-muted': 'var(--state-warning-muted)',
          'info': 'var(--state-info)',
          'info-muted': 'var(--state-info-muted)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // Для центрированных диалогов: сохраняем translate(-50%,-50%) во время анимации,
        // иначе entry-transform перебивает центрирование и диалог уезжает от центра.
        'dialog-in': {
          from: { opacity: '0', transform: 'translate(-50%, calc(-50% + 6px)) scale(0.98)' },
          to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-out-left': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-100%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out both',
        'fade-out': 'fade-out 200ms ease-out both',
        'fade-in-up': 'fade-in-up 200ms ease-out both',
        // Без fill-mode: после анимации transform возвращается к статическому translate(-50%,-50%).
        'dialog-in': 'dialog-in 200ms ease-out',
        'slide-in-left': 'slide-in-left 250ms ease-out both',
        'slide-out-left': 'slide-out-left 200ms ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
