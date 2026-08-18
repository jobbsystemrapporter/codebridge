import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = path.dirname(fileURLToPath(import.meta.url));

// The renderer builds static assets into the repo's src/public/ folder, which the
// CodeBridge local server serves. The backend/API contract is untouched.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
    },
  },
  build: {
    outDir: path.resolve(root, "../src/public"),
    emptyOutDir: true,
  },
});
