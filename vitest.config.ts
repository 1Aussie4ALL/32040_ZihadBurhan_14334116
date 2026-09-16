import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const TEST_DATABASE_URL = `file:${path.resolve(__dirname, "prisma/test.db")}`;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Next.js resolves "server-only" to a no-op via the "react-server" bundler
      // condition; under plain Node (Vitest) it always throws, so alias it to the
      // package's own empty stub here.
      "server-only": path.resolve(__dirname, "./node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // Integration tests run against a disposable SQLite database created in
    // globalSetup, never the demo prisma/dev.db.
    globalSetup: ["./tests/globalSetup.ts"],
    env: { DATABASE_URL: TEST_DATABASE_URL },
    exclude: ["node_modules", ".next", "_archive"],
  },
});
