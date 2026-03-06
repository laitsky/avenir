import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import tsconfigPaths from "vite-tsconfig-paths";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const config = defineConfig({
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  resolve: {
    alias: {
      // @arcium-hq/client@0.5.2 imports Node `crypto` at module top level.
      // Alias to crypto-browserify so the SDK can be bundled for the browser.
      crypto: "crypto-browserify",
      stream: "stream-browserify",
    },
  },
  define: {
    // Some transitive deps (crypto-browserify) reference `process.browser`
    "process.browser": true,
  },
});

export default config;
