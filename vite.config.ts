import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "./",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "index.html",
      external: [], 
      output: {
        manualChunks: {
          swr: ['swr']
        }
      }
    }
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
});// Force Cache Invalidation: 639127096090579735