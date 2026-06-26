/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Stitch Design System - Corporate Modern
        primary: {
          DEFAULT: '#0041a2',
          dark: '#a8c7fa',
          light: '#0b57d0',
          container: {
            DEFAULT: '#0b57d0',
            dark: '#1f3760',
            light: '#d3e3fd',
          },
          fixed: {
            DEFAULT: '#dae2ff',
            dim: '#b2c5ff',
          },
          on: {
            DEFAULT: '#ffffff',
            container: '#ced9ff',
            fixed: '#001847',
            'fixed-variant': '#0040a1',
          },
        },
        secondary: {
          DEFAULT: '#00639b',
          dark: '#7fcfff',
          container: '#7ec1ff',
          fixed: {
            DEFAULT: '#cee5ff',
            dim: '#96cbff',
          },
          on: {
            DEFAULT: '#ffffff',
            container: '#004f7d',
            fixed: '#001d33',
            'fixed-variant': '#004a76',
          },
        },
        tertiary: {
          DEFAULT: '#802b00',
          container: '#a83b00',
          fixed: {
            DEFAULT: '#ffdbce',
            dim: '#ffb599',
          },
          on: {
            DEFAULT: '#ffffff',
            container: '#ffcfbe',
            fixed: '#370e00',
            'fixed-variant': '#7f2b00',
          },
        },
        // Surfaces
        surface: {
          DEFAULT: '#faf8ff',
          bright: '#faf8ff',
          dim: '#d9d9e4',
          tint: '#0856cf',
          variant: '#e1e2ec',
          container: {
            DEFAULT: '#ededf8',
            high: '#e7e7f2',
            highest: '#e1e2ec',
            low: '#f3f3fd',
            lowest: '#ffffff',
            light: '#f0f4f9',
            dark: '#282a2c',
          },
        },
        // Status colors
        success: '#146c2e',
        warning: '#f9ab00',
        error: {
          DEFAULT: '#b3261e',
          container: '#ffdad6',
        },
        // Background
        background: {
          DEFAULT: '#faf8ff',
          on: '#191b23',
        },
        // Inverse
        inverse: {
          surface: '#2e3038',
          'on-surface': '#f0f0fb',
          primary: '#b2c5ff',
        },
        // Outline
        outline: {
          DEFAULT: '#737785',
          variant: '#c3c6d6',
          light: '#dcdfe5',
          dark: '#2d2f38',
        },
        // On colors
        on: {
          surface: {
            DEFAULT: '#191b23',
            variant: '#424654',
          },
          'secondary-container': '#004f7d',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        'headline-lg': ['Plus Jakarta Sans'],
        'headline-md': ['Plus Jakarta Sans'],
        'body-md': ['Plus Jakarta Sans'],
        'label-mono': ['JetBrains Mono'],
        'metric-display': ['JetBrains Mono'],
      },
      fontSize: {
        'headline-lg': ['36px', { lineHeight: '1.2', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'body-md': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'metric-display': ['32px', { lineHeight: '1.1', fontWeight: '700' }],
        'label-mono': ['12px', { lineHeight: '1.0', fontWeight: '500' }],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        '2xl': '1.75rem', // 28px for large layouts
        'component': '0.75rem', // 12px for components
        full: '9999px',
      },
      spacing: {
        gutter: '1rem',
        'margin-mobile': '1rem',
        'margin-desktop': '2rem',
        'component-gap': '0.75rem',
      },
      boxShadow: {
        'card': '0 4px 12px rgba(0,0,0,.04)',
        'card-dark': '0 4px 12px rgba(0,0,0,.12)',
      },
      transitionTimingFunction: {
        'bezier': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        '200': '200ms',
      },
      borderColor: {
        DEFAULT: '#dcdfe5', // Light mode outline
        dark: '#2d2f38', // Dark mode outline
      },
    },
  },
  plugins: [],
};