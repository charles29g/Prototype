import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "build", // Output to 'build' folder instead of default 'dist'
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large dependencies into separate chunks
          mapbox: ["mapbox-gl"], // Will create 'mapbox-[hash].js'
          react: ["react", "react-dom"], // Will create 'react-[hash].js'
          // Add other large dependencies here if needed
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase warning limit (in kB)
  },
});
