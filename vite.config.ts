// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only), Vite env handling, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

export default defineConfig({
  envDefine: false,
  nitro: { preset: "netlify" },
  vite: {
    envPrefix: ["VITE_FIREBASE_", "VITE_PUBLIC_SITE_URL"],
    plugins: [
      {
        name: "load-server-only-env",
        configResolved(config) {
          const env = loadEnv(config.mode, config.envDir, "");
          for (const [name, value] of Object.entries(env)) {
            if (!name.startsWith("VITE_") && process.env[name] === undefined) {
              process.env[name] = value;
            }
          }
        },
      },
    ],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
