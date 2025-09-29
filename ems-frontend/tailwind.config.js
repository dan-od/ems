/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",   
  ],
  theme: {
    extend: {
      colors: {
        wfsl: {
          orange: "#FF7F00",   // main brand orange
          orangeDark: "#E56700",
          gray: "#333",
          light: "#f9f9f9",
        },
      },
      fontFamily: {
        sans: ["General Sans", "sans-serif"], //  chosen font
      },
    },
  },
  plugins: [],
};
