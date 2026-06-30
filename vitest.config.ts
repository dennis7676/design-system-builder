import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "golden/**/*.test.ts"],
    environment: "node",
  },
});
