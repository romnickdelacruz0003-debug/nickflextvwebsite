// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import { loadEnv } from "vite";
import path from "node:path";

// Load all env vars (including non-VITE_ server secrets) into process.env for server routes.
const serverEnv = loadEnv(process.env['NODE_ENV'] || "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve(process.cwd(), "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(process.cwd(), "node_modules/entities/lib/encode.js"),
        "entities": path.resolve(process.cwd(), "node_modules/entities"),
      },
    },
    plugins: [
      VitePWA({
        // We already maintain public/manifest.webmanifest manually.
        manifest: false,
        registerType: "autoUpdate",
        // The app registers the service worker itself from a guarded wrapper.
        injectRegister: null,
        // No SW in dev/preview to avoid stale caches during development.
        devOptions: { enabled: false },
        workbox: {
          // Precache hashed static assets only (JS/CSS/images/fonts/manifest).
          globPatterns: [
            "**/*.{js,css,html,ico,png,svg,webp,woff,woff2,webmanifest}",
          ],
          // SSR app: never serve cached HTML as a fallback; navigations hit the server.
          navigateFallback: null,
          // Keep runtime caches small and targeted. HTML is fetched live from the server.
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-stylesheets",
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-webfonts",
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      }),
    ],
  },
});
