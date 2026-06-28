import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async ({ command }) => {
  const isBuild = command === "build";

  const rawPort = process.env.PORT;
  const port = rawPort ? Number(rawPort) : 3000;

  if (!isBuild && (!rawPort || Number.isNaN(port) || port <= 0)) {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }

  const basePath = process.env.BASE_PATH ?? "/";

  if (!isBuild && !process.env.BASE_PATH) {
    throw new Error(
      "BASE_PATH environment variable is required but was not provided.",
    );
  }

  const outDir = process.env.BUILD_OUT_DIR
    ? path.resolve(process.env.BUILD_OUT_DIR)
    : path.resolve(import.meta.dirname, "dist/public");

  return {
    base: basePath,
    plugins: [
      TanStackRouterVite({ routesDirectory: "./src/routes", generatedRouteTree: "./src/routeTree.gen.ts" }),
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, ".."),
              }),
            ),
            await import("@replit/vite-plugin-dev-banner").then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir,
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
