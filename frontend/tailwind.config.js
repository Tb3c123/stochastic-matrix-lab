/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        vietlott: {
          red: '#ED1C24',
          orange: '#F7941D',
          dark: '#111827',
          card: '#1F2937'
        }
      }
    },
  },
  plugins: [],
}
