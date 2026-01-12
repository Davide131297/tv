/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFiles: ["dotenv/config"],
  testTimeout: 120000,
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          // Force CommonJS for tests to avoid "Cannot use import statement outside a module"
          module: "commonjs",
          jsx: "react-jsx",
          esModuleInterop: true,
        },
        useESM: false,
      },
    ],
  },
};
