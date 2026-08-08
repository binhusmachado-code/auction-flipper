/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        ink: {
          50: '#f8f7f4',
          100: '#eeede8',
          200: '#dddad1',
          300: '#c4bfb3',
          400: '#a8a192',
          500: '#8f8777',
          600: '#736c60',
          700: '#5e584e',
          800: '#4a453f',
          900: '#2d2a26',
          950: '#1a1815',
        },
        sand: {
          50: '#fdfcfa',
          100: '#faf8f3',
          200: '#f5f0e6',
          300: '#ede5d5',
          400: '#e0d4be',
        },
        accent: {
          DEFAULT: '#c9a96e',
          light: '#d9bc8a',
          dark: '#a88850',
        }
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      },
      transitionTimingFunction: {
        'fluid': 'cubic-bezier(0.32, 0.72, 0, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      boxShadow: {
        'soft': '0 4px 24px -4px rgba(26, 24, 21, 0.08)',
        'soft-lg': '0 8px 40px -8px rgba(26, 24, 21, 0.12)',
        'inner-glow': 'inset 0 1px 1px rgba(255,255,255,0.6)',
        'card': '0 2px 8px rgba(26, 24, 21, 0.04), 0 0 1px rgba(26, 24, 21, 0.08)',
      },
      animation: {
        'fade-up': 'fadeUp 0.7s cubic-bezier(0.32, 0.72, 0, 1) forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
