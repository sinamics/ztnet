import { buildSshArgs } from "~/server/api/services/remoteRootSshService";

describe("remoteRootSshService", () => {
	it("builds ssh args without using a shell command string", () => {
		const args = buildSshArgs({
			host: "root.example.com",
			port: 2222,
			user: "root",
			identityFile: "/tmp/ztnet-key",
			command: "zerotier-cli info",
			connectTimeoutSeconds: 10,
		});

		expect(args).toEqual([
			"-i",
			"/tmp/ztnet-key",
			"-p",
			"2222",
			"-o",
			"BatchMode=yes",
			"-o",
			"StrictHostKeyChecking=accept-new",
			"-o",
			"ConnectTimeout=10",
			"root@root.example.com",
			"zerotier-cli info",
		]);
	});

	it("rejects multiline commands", () => {
		expect(() =>
			buildSshArgs({
				host: "root.example.com",
				port: 22,
				user: "root",
				identityFile: "/tmp/ztnet-key",
				command: "whoami\nuname -a",
			}),
		).toThrow(/multiline/i);
	});
});
