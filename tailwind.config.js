/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Geist', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: { 50: '#faf8f5', 100: '#f3f0ea', 200: '#e6e1d8', 300: '#cfc8bb', 400: '#a29a8c', 500: '#78705f', 600: '#585143', 700: '#3e382e', 800: '#26221c', 900: '#16130f', 950: '#0b0907' },
        brand: { 50: '#fff4ed', 100: '#ffe5d3', 200: '#ffc7a5', 300: '#ff9f6d', 400: '#ff7a3d', 500: '#ff5a1f', 600: '#ec4410', 700: '#c4320c', 800: '#9b2a12', 900: '#7d2512' },
        accent: { 50: '#fffbea', 100: '#fff2c4', 200: '#ffe285', 300: '#ffcd47', 400: '#fdb81e', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
        success: {
          50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
          400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
          800: '#065f46', 900: '#064e3b',
        },
        warning: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
          400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
          800: '#92400e', 900: '#78350f',
        },
        error: {
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
          400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
          800: '#991b1b', 900: '#7f1d1d',
        },
      },
      fontSize: {
        'display': ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-sm': ['2.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(22, 19, 15, 0.06), 0 4px 16px -4px rgba(22, 19, 15, 0.08)',
        'soft-lg': '0 4px 16px -4px rgba(22, 19, 15, 0.08), 0 8px 32px -8px rgba(22, 19, 15, 0.12)',
        'glow': '0 0 0 1px rgba(255, 90, 31, 0.1), 0 8px 24px -8px rgba(255, 90, 31, 0.3)',
        'glow-lg': '0 0 0 1px rgba(255, 90, 31, 0.15), 0 12px 48px -12px rgba(255, 90, 31, 0.4)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'scale-out': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.96)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out forwards',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
        'fade-out': 'fade-out 0.25s ease-in forwards',
        'scale-out': 'scale-out 0.25s ease-in forwards',
        'slide-down': 'slide-down 0.3s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
      },
    },
  },
  plugins: [],
};
