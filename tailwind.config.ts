import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "surface-admin": "#f8f9fb",
        "panel-admin": "#ffffff",
        "border-admin": "#e4e7ec",
        "text-admin-1": "#101828",
        "text-admin-2": "#475467",
        "text-admin-3": "#98a2b3",
        "surface-ws": "#080d12",
        "panel-ws": "#0f1720",
        "card-ws": "#141e2b",
        "border-ws": "rgba(255,255,255,0.07)",
        "border-ws-2": "rgba(255,255,255,0.13)",
        "text-ws-1": "#f0f4f8",
        "text-ws-2": "#8a9bb0",
        "text-ws-3": "#4a5a6e",
        "signal-glow": "rgba(13,122,95,0.15)",
        "signal-text": "#1fd99d",
        ink: "#0c1117",
        graphite: "#2a3139",
        steel: "#5c6b7a",
        cloud: "#f4f6f8",
        line: "#d4dbe4",
        signal: "#0d7a5f",
        "signal-bright": "#12a37f",
        caution: "#a35c00",
        critical: "#b42318"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        serif: ["var(--font-instrument-serif)", "Georgia", "serif"]
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(13, 122, 95, 0.12), 0 24px 48px -12px rgba(12, 17, 23, 0.18)",
        card: "0 1px 2px rgba(12, 17, 23, 0.04), 0 12px 32px -8px rgba(12, 17, 23, 0.12)"
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.55s ease-out forwards",
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" }
        }
      },
      backgroundImage: {
        "mesh-light":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(13, 122, 95, 0.14), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(13, 122, 95, 0.08), transparent), radial-gradient(ellipse 50% 30% at 0% 100%, rgba(92, 107, 122, 0.06), transparent)"
      }
    }
  },
  plugins: []
};

export default config;
