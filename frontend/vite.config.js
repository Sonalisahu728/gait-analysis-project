import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxies /api/* calls to the Spring Boot backend during local dev,
// so the frontend can just fetch("/api/...") without hardcoding a host.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
