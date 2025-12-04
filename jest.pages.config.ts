import type { JestConfigWithTsJest } from "ts-jest";
// jest.config.mjs
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

const jestConfig: JestConfigWithTsJest = {
  clearMocks: true,
  coverageProvider: "v8",
  preset: "ts-jest/presets/js-with-ts",
  setupFiles: ["dotenv/config"],
  transform: {
    "^.+\\.mjs$": "ts-jest",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",
  modulePathIgnorePatterns: ["<rootDir>/docs/"],
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/src/$1",
    "^lib/(.*)$": "<rootDir>/common/$1",
  },
  testMatch: ["**/__tests__/**/*.test.tsx"],
};

// Use async wrapper to properly set transformIgnorePatterns after Next.js processes config
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async () => ({
  ...(await createJestConfig(jestConfig as any)()),
  transformIgnorePatterns: ["node_modules/(?!next-intl)/"],
});
