import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: path.resolve(__dirname),
  publicDir: path.resolve(__dirname, "../../sample"),
  server: {
    port: 5174,
    strictPort: true,
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
});
