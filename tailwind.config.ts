import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        sidebar: {
          DEFAULT: 'var(--sidebar-background)',
          light: '#F7F7F5',
          dark: '#202020',
        },
        canvas: {
          DEFAULT: 'var(--background)',
          light: '#FBFBF9',
          dark: '#191919',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          elevated: 'var(--surface-elevated)',
          light: '#FFFFFF',
          dark: '#222222',
        },
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
          light: '#E5E5E0',
          dark: '#2E2E2E',
        },
        primaryText: {
          DEFAULT: 'var(--foreground)',
          light: '#2D2D2D',
          dark: '#EDEDEC',
        },
        mutedText: {
          DEFAULT: 'var(--muted)',
          light: '#737373',
          dark: '#9B9A97',
        },
        hover: 'var(--hover)',
        selected: 'var(--selected)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          subtle: 'var(--accent-subtle)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        area: {
          study: '#3B6D9E',
          fitness: '#4A7C59',
          projects: '#C68B45',
          personal: '#C46859',
        },
      },
      borderRadius: {
        DEFAULT: '0.375rem',
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
