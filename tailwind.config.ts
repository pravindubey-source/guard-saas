import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          500: "#2f5fdb",
          600: "#274ec2",
          700: "#1f3f9e",
          900: "#152a68",
        },
      },
    },
  },
  plugins: [],
};
export default config;
