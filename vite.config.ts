import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const githubPages = process.env.NITRO_PRESET === "github_pages";

export default defineConfig(({ command, isPreview }) => ({
  base: githubPages ? "/ossuary/" : "/",
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" || isPreview
      ? [nitro({ preset: githubPages ? "github_pages" : "vercel" })]
      : []),
    viteReact(),
  ],
}));
