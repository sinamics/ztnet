import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma CLI configuration
// See: https://www.prisma.io/docs/orm/reference/prisma-config-reference
export default defineConfig({
	// Path to your Prisma schema (or a folder with *.prisma files)
	schema: "./prisma",

	// Optional: explicit migrations folder (default is prisma/migrations)
	migrations: {
		path: "./prisma/migrations",
		seed: "tsx prisma/seed.ts",
	},
});
