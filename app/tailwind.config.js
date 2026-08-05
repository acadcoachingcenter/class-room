/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1F2A24",
        board: "#16352B",
        boarddark: "#0E241C",
        chalk: "#F6F3E7",
        chalkline: "#E4DFCE",
        accent: "#E8A33D",
        accentdark: "#C6822A",
        slate: "#5B6B63",
        live: "#3FA796",
      },
      fontFamily: {
        display: ["'Lora'", "serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      backgroundImage: {
        ruled: "repeating-linear-gradient(to bottom, transparent, transparent 34px, #E4DFCE 35px)",
      },
    },
  },
  plugins: [],
}
