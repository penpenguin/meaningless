/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'aqua-dark': '#0e3d4e',
        'aqua-light': '#6ac7d6',
        'aqua-accent': '#4a9eb2',
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        aquarium: {
          "primary": "#6ac7d6",
          "secondary": "#4a9eb2",
          "accent": "#3dd9ed",
          "neutral": "#0e3d4e",
          "base-100": "#0a2e3d",
          "info": "#2094f3",
          "success": "#16a34a",
          "warning": "#fbbf24",
          "error": "#dc2626",
        },
      },
    ],
  },
}