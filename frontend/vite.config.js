import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        // Uses your Railway environment variable or falls back to localhost for your computer
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    // This allows Railway to safely read the port and display your site online
    host: true,
    port: process.env.PORT ? parseInt(process.env.PORT) : 4173,
  }
});

});
