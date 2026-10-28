import { configDefaults, defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // mobile_rn has its own Jest setup (React Native); run its tests from there.
    exclude: [...configDefaults.exclude, "mobile_rn/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
