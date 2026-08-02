/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: {
          950: "#0a0f0d",
          900: "#0f1613",
          800: "#161f1b",
          700: "#212d27",
        },
        emerald: {
          50: "#eafbf3",
          100: "#c9f4e0",
          300: "#6be3ae",
          400: "#35d29a",
          500: "#16c98d", // primary brand accent
          600: "#0ea975",
          700: "#0a8760",
        },
        surface: {
          DEFAULT: "#f6f9f8",
          card: "#ffffff",
          border: "#e1e8e4",
          muted: "#5b6b66",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        "circuit-dark":
          "radial-gradient(circle at 20% 20%, rgba(22,201,141,0.08), transparent 40%), radial-gradient(circle at 80% 60%, rgba(22,201,141,0.06), transparent 45%)",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(10,15,13,0.06), 0 8px 24px -12px rgba(10,15,13,0.12)",
      },
    },
  },
  plugins: [],
};
