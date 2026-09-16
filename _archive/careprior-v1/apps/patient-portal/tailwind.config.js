/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#0F5F5C", hover: "#0B4D4A", light: "#DDF1EF" },
        secondary: { DEFAULT: "#296A8A", light: "#E4F1F7" },
        accent: "#49A7A2",
        bg: { main: "#F5F8F8", surface: "#FFFFFF", secondary: "#EDF3F3", sidebar: "#123B3A" },
        text: { primary: "#162323", secondary: "#536666", muted: "#748383", ondark: "#F8FFFF" },
        border: { DEFAULT: "#D6E1E1", strong: "#B8CACA" },
        status: {
          routine: "#3E7C59",
          "routine-bg": "#E5F2E9",
          priority: "#B7791F",
          "priority-bg": "#FFF4D6",
          immediate: "#B83A3A",
          "immediate-bg": "#FCE8E8",
          insufficient: "#6B5AA6",
          "insufficient-bg": "#EEEAF8",
          manual: "#556270",
          "manual-bg": "#E9EDF0",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["Manrope", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "12px", button: "10px", input: "8px" },
    },
  },
  plugins: [],
};
