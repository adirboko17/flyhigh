import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/layouts/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // מותג "על הגובה" — כחול-תכלת מים יוקרתי
        brand: {
          50: "#eff9ff",
          100: "#def1ff",
          200: "#b6e5ff",
          300: "#75d2ff",
          400: "#2cbcff",
          500: "#02a3f0",
          600: "#0082cd",
          700: "#0067a6",
          800: "#055889",
          900: "#0a4a71",
          950: "#072e4b",
        },
        // משני — טורקיז/אקווה
        aqua: {
          50: "#edfcf6",
          100: "#d3f8e9",
          200: "#aaf0d6",
          300: "#72e1bf",
          400: "#39c9a3",
          500: "#16b08b",
          600: "#0a8d72",
          700: "#09715e",
          800: "#0a5a4c",
          900: "#0a4a40",
          950: "#032a25",
        },
        logo: {
          magenta: "#ec008c",
          cyan: "#00aeef",
          orange: "#fbb03b",
        },
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d4d9e3",
          300: "#aeb8cb",
          400: "#8292ad",
          500: "#627393",
          600: "#4d5c7a",
          700: "#404a63",
          800: "#384053",
          900: "#1f2433",
          950: "#141826",
        },
      },
      fontFamily: {
        sans: ["var(--font-heebo)", "system-ui", "sans-serif"],
        display: ["var(--font-assistant)", "var(--font-heebo)", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(16, 42, 75, 0.08), 0 4px 24px -4px rgba(16, 42, 75, 0.08)",
        card: "0 1px 2px rgba(16, 42, 75, 0.06), 0 8px 28px -8px rgba(16, 42, 75, 0.12)",
        glow: "0 8px 32px -8px rgba(2, 163, 240, 0.35)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
