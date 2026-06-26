---
name: Corporate Modern
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fd'
  surface-container: '#ededf8'
  surface-container-high: '#e7e7f2'
  surface-container-highest: '#e1e2ec'
  on-surface: '#191b23'
  on-surface-variant: '#424654'
  inverse-surface: '#2e3038'
  inverse-on-surface: '#f0f0fb'
  outline: '#737785'
  outline-variant: '#c3c6d6'
  surface-tint: '#0856cf'
  primary: '#0041a2'
  on-primary: '#ffffff'
  primary-container: '#0b57d0'
  on-primary-container: '#ced9ff'
  inverse-primary: '#b2c5ff'
  secondary: '#00639b'
  on-secondary: '#ffffff'
  secondary-container: '#7ec1ff'
  on-secondary-container: '#004f7d'
  tertiary: '#802b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#a83b00'
  on-tertiary-container: '#ffcfbe'
  error: '#b3261e'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001847'
  on-primary-fixed-variant: '#0040a1'
  secondary-fixed: '#cee5ff'
  secondary-fixed-dim: '#96cbff'
  on-secondary-fixed: '#001d33'
  on-secondary-fixed-variant: '#004a76'
  tertiary-fixed: '#ffdbce'
  tertiary-fixed-dim: '#ffb599'
  on-tertiary-fixed: '#370e00'
  on-tertiary-fixed-variant: '#7f2b00'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ec'
  primary-dark: '#a8c7fa'
  primary-container-light: '#d3e3fd'
  primary-container-dark: '#1f3760'
  secondary-dark: '#7fcfff'
  surface-container-light: '#f0f4f9'
  surface-container-dark: '#282a2c'
  success: '#146c2e'
  warning: '#f9ab00'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  metric-display:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.1'
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin-mobile: 1rem
  margin-desktop: 2rem
  component-gap: 0.75rem
---

# Visual Design System: tokens.utilifygrid.com

## 1. Brand Palette & Color Tokens

```json
{
  "colors": {
    "primary": {
      "light": "#0b57d0", 
      "dark": "#a8c7fa",
      "description": "Core Royal Blue - Accent focus states & primary buttons"
    },
    "primary_container": {
      "light": "#d3e3fd",
      "dark": "#1f3760"
    },
    "secondary": {
      "light": "#00639b",
      "dark": "#7fcfff",
      "description": "Muted Slate Blue - Decorative elements, subheadings"
    },
    "background": {
      "light": "#ffffff",
      "dark": "#101218",
      "description": "Pure white for readability; deep dark mode avoiding pure black #000"
    },
    "surface_container": {
      "light": "#f0f4f9",
      "dark": "#282a2c",
      "description": "Card backgrounds, input container fills"
    },
    "text": {
      "primary": { "light": "#1b1c1d", "dark": "#ffffff" },
      "secondary": { "light": "#444746", "dark": "#c4c7c5" }
    },
    "status": {
      "success": "#146c2e",
      "error": "#b3261e",
      "warning": "#f9ab00"
    }
  }
}
```

## 2. Typography & Type Scale

- **Primary Type Family:** 'Google Sans', 'Inter', sans-serif
- **Monospace Family (Data tables/numbers):** 'Google Sans Code', 'Roboto Mono', monospace
- **Scale Hierarchy:**

  - **H1 (Page Titles):** 36px / Bold (Font Weight 700) / Line-height 1.2
  - **H2 (Section Cards):** 24px / Medium (Font Weight 600) / Line-height 1.3
  - **Body Copy:** 14px / Regular (Font Weight 400) / Line-height 1.5
  - **Metric Values (Large HUD labels):** 32px / Bold (Font Weight 700) / Monospace Numbers

## 3. Interface Rules & Visual Constraints

1. **Component Corners:** border-radius: 12px strictly applied to card decks, slider track boundaries, input controls, and system buttons. Large layouts like page wrappers should use border-radius: 28px.
2. **Stroke Outline States:**
  - Light Mode: 1px solid #dcdfe5
  - Dark Mode: 1px solid #2d2f38
3. **Elevations & Shadows:** Use flat design with subtle card elevation depth:
  - box-shadow: 0 4px 12px rgba(0,0,0,.04)
4. **Interactive Focus:** Any slider handle or input focus state must transition cleanly with a 200ms Bezier curve using the primary brand blue outline.

