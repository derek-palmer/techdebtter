import { defineConfig } from "tsup";

const shared = {
  format: ["esm"] as const,
  target: "node22",
  outDir: "dist",
  sourcemap: true,
  splitting: false,
};

export default defineConfig([
  {
    ...shared,
    entry: { index: "src/index.ts" },
    dts: true,
    clean: true,
  },
  {
    ...shared,
    entry: {
      "cli/main": "src/cli/main.ts",
      "cli/bootstrap": "src/cli/bootstrap.ts",
    },
    dts: false,
    clean: false,
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
  {
    ...shared,
    entry: {
      "action/main": "src/action/main.ts",
    },
    dts: false,
    clean: false,
    // Bundle dependencies so the Action runs without a separate npm install.
    noExternal: [/.*/],
  },
]);
