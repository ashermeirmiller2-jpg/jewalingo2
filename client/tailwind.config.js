/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        parchment: "#faf6ef",
        ink: "#1e1208",
        gold: "#c9a227",
      },
      fontFamily: {
        garamond: ['"EB Garamond"', "Georgia", "serif"],
        hebrew: ['"Frank Ruhl Libre"', "serif"],
        aramaic: ['"SBL Hebrew"', '"Times New Roman"', '"Frank Ruhl Libre"', "serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(30, 18, 8, 0.08), 0 4px 16px rgba(30, 18, 8, 0.06)",
      },
    },
  },
  plugins: [],
};
