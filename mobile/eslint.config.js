// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const globals = require("globals");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "web-build/*", ".expo/*", "node_modules/*"],
  },
  {
    // Node scripts (asset generation, config files)
    files: ["tools/**/*.js", "*.config.js"],
    languageOptions: { globals: globals.node },
  },
]);
