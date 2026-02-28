/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#f5f0e8",
        "cream-dark": "#ede7d9",
        "cream-darker": "#e0d8c8",
        ink: "#2c2416",
        "ink-light": "#5a4a32",
        amber: "#c17b2e",
        "amber-light": "#d4943e",
        "amber-pale": "#f0e0c8",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
        serif: ["Lora", "serif"],
      },
    },
  },
  plugins: [],
};
