/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#07C160',
        secondary: '#10AEFF',
        background: '#F7F5F2',
        surface: '#FFFFFF',
        text: '#1A1A1A',
        'text-muted': '#8E8E93',
        border: '#E5E5EA',
      },
    },
  },
  plugins: [],
}
