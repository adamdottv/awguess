// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fontFamily } = require("tailwindcss/defaultTheme")

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        red: {
          1: "#1f1315",
          2: "#291415",
          3: "#3c181a",
          4: "#481a1d",
          5: "#541b1f",
          6: "#671e22",
          7: "#822025",
          8: "#aa2429",
          9: "#e5484d",
          10: "#f2555a",
          11: "#ff6369",
          12: "#feecee",
        },
        green: {
          1: "#0d1912",
          2: "#0c1f17",
          3: "#0f291e",
          4: "#113123",
          5: "#133929",
          6: "#164430",
          7: "#1b543a",
          8: "#236e4a",
          9: "#30a46c",
          10: "#3cb179",
          11: "#4cc38a",
          12: "#e5fbeb",
        },
        orange: {
          1: "#1f1206",
          2: "#2b1400",
          3: "#391a03",
          4: "#441f04",
          5: "#4f2305",
          6: "#5f2a06",
          7: "#763205",
          8: "#943e00",
          9: "#f76808",
          10: "#ff802b",
          11: "#ff8b3e",
          12: "#feeadd",
        },
        blue: {
          1: "#0f1720",
          2: "#0f1b2d",
          3: "#10243e",
          4: "#102a4c",
          5: "#0f3058",
          6: "#0d3868",
          7: "#0a4481",
          8: "#0954a5",
          9: "#0091ff",
          10: "#369eff",
          11: "#52a9ff",
          12: "#eaf6ff",
        },
        gray: {
          1: "#151718",
          2: "#1a1d1e",
          3: "#202425",
          4: "#26292b",
          5: "#2b2f31",
          6: "#313538",
          7: "#3a3f42",
          8: "#4c5155",
          9: "#697177",
          10: "#787f85",
          11: "#9ba1a6",
          12: "#ecedee",
        },
      },
      keyframes: {
        appear: {
          from: {
            transform: "scale3d(1, 1, 1);",
          },
          "10%,20%": {
            transform: "scale3d(0.8, 0.8, 0.8) rotate3d(0, 0, 1, -3deg);",
          },
          "30%,50%,70%,90%": {
            transform: "scale3d(1.2, 1.2, 1.2) rotate3d(0, 0, 1, 3deg);",
          },
          "40%,60%,80%": {
            transform: "scale3d(1.2, 1.2, 1.2) rotate3d(0, 0, 1, -3deg);",
          },
          to: {
            transform: "scale3d(0, 0, 0);",
          },
        },
        shake: {
          "10%, 90%": {
            transform: "translate3d(-1px, 0, 0);",
          },
          "20%, 80%": {
            transform: "translate3d(2px, 0, 0);",
          },
          "30%, 50%, 70%": {
            transform: "translate3d(-4px, 0, 0);",
          },
          "40%, 60%": {
            transform: "translate3d(4px, 0, 0);",
          },
        },
      },
      animation: {
        appear: "appear 1.5s ease-out both",
        shake: "shake 0.82s cubic-bezier(.36,.07,.19,.97) both",
      },
      fontFamily: {
        display: ["var(--display-font)", ...fontFamily.serif],
      },
    },
  },
  plugins: [],
}
