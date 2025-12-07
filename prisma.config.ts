import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
	earlyAccess: true,
	schema: "prisma/schema.prisma",
	datasource: {
		url: env("DATABASE_URL"),
	},
	migrations: {
		path: "prisma/migrations",
		seed: "npx tsx prisma/seed.ts",
	},
});
