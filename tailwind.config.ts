import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1A2332",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#FF6B00",
          foreground: "#FFFFFF",
        },
        background: "#F8F9FA",
        border: "#E2E5EA",
        muted: {
          DEFAULT: "#F1F2F4",
          foreground: "#64748B",
        },
        success: "#22C55E",
        warning: "#EAB308",
        danger: "#EF4444",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
    },
  },
  plugins: [],
};

export default config;
