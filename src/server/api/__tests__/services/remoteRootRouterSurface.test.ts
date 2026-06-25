import fs from "node:fs";
import path from "node:path";

describe("remoteRootRouter API surface", () => {
	it("does not expose manual managed-key regeneration after keys became automatic", () => {
		const source = fs.readFileSync(
			path.join(process.cwd(), "src/server/api/routers/remoteRootRouter.ts"),
			"utf8",
		);

		expect(source).not.toContain("generateManagedKey");
	});
});
