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
        canvas: {
          light: '#FBFBF9',
          dark: '#191919',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#222222',
        },
        border: {
          light: '#E5E5E0',
          dark: '#2E2E2E',
        },
        primaryText: {
          light: '#2D2D2D',
          dark: '#EAEAEA',
        },
        mutedText: {
          light: '#737373',
          dark: '#9A9A9A',
        },
        accent: {
          DEFAULT: '#3B6D9E',
          hover: '#315A82',
          subtle: '#EEF4FA',
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
