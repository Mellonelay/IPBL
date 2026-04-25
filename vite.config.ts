import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "./",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "index.html",
    },
  },
  optimizeDeps: {
    include: ["swr", "react", "react-dom"],
  },
  plugins: [react()],
  server: {
    port: 4873,
    proxy: {
      "/api/ipbl": {
        target: "https://api.ipbl.pro",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/ipbl/, ""),
      },
    },
  },
});