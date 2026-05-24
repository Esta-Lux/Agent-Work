import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101418",
        graphite: "#2f343b",
        steel: "#62707f",
        cloud: "#f6f7f9",
        line: "#d9dee5",
        signal: "#1f7a5b",
        caution: "#a35c00",
        critical: "#b42318"
      }
    }
  },
  plugins: []
};

export default config;
