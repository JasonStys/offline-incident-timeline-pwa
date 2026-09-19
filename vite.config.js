/**
 * @file Produces deterministic asset names so the Service Worker can precache the app shell.
 * Functions: defineConfig callback.
 * Variables: build configuration and Rollup output naming rules.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    cssCodeSplit: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/app.js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: (assetInfo) =>
          assetInfo.names.some((name) => name.endsWith(".css"))
            ? "assets/app.css"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
});
