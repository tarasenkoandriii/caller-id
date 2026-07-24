/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0E1116',
        panel: '#151A21',
        line: '#232A33',
        accent: '#3DDC97',
        warn: '#E8B339',
        danger: '#E5484D',
      },
    },
  },
  plugins: [],
};
