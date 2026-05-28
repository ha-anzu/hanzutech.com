/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        hanzu: {
          bg: "#0a0a0f",
          red: "#ff0033",
          yellow: "#ffcc00",
          panel: "#050509"
        }
      },
      fontFamily: {
        mono: ["var(--font-plex-mono)", "monospace"],
        sans: ["var(--font-plex-sans)", "sans-serif"]
      }
    }
  },
  plugins: []
};
