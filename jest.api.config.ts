import type { JestConfigWithTsJest } from "ts-jest";
import nextJest from "next/jest.js";

const nextConfig = {
	dir: "./", // Path to your Next.js app
};

const baseConfig: JestConfigWithTsJest = {
	clearMocks: true,
	coverageProvider: "v8",
	preset: "ts-jest/presets/js-with-ts",
	transform: {
		"^.+\\.mjs$": "ts-jest",
	},
};

const filesConfig = {
	setupFiles: ["dotenv/config"],
	setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};

const moduleConfig = {
	moduleNameMapper: {
		"^~/(.*)$": "<rootDir>/src/$1",
	},
};

const testConfig = {
	testMatch: [
		"**/server/api/__tests__/**/*.test.ts",
		"**/pages/api/__tests__/**/*.test.ts",
	],
};

const jestConfig: JestConfigWithTsJest = {
	...baseConfig,
	...filesConfig,
	...moduleConfig,
	...testConfig,
};

const createJestConfig = nextJest(nextConfig);

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export default createJestConfig(jestConfig as any);
