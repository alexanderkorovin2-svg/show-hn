import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "static-story",
  base: "/stories/show-hn/",
  plugins: [react()],
  build: {
    outDir: "../static-dist",
    emptyOutDir: true,
  },
});
