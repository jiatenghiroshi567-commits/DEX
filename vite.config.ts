import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
const plugins = [react(), tailwindcss(), jsxLocPlugin()];
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const devPort = Number.parseInt(process.env.PORT || "3000", 10);
const buildOutDir = process.env.BUILD_OUT_DIR || "dist";

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  envDir: path.resolve(__dirname),
  root: path.resolve(__dirname, "client"),
  publicDir: path.resolve(__dirname, "client", "public"),
  build: {
    outDir: path.resolve(__dirname, buildOutDir),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000, // Increase limit to suppress warnings
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress circular dependency warnings
        if (warning.code === 'CIRCULAR_DEPENDENCY') {
          return;
        }
        warn(warning);
      },
      // Let Rollup handle chunking automatically to avoid circular dependency issues
      // Do NOT use manualChunks with complex web3 libraries
    },
  },
  server: {
    host: true,
    port: devPort,
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    host: true,
    port: devPort,
  },
});
