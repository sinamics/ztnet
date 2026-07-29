import { RemoteRootSshError } from "~/server/api/services/remoteRootSshService";

describe("RemoteRootSshError", () => {
	it("reports an SSH timeout without exposing the temporary identity path", () => {
		const error = new RemoteRootSshError({
			stderr: "ssh: connect to host 203.0.113.10 port 22: Connection timed out",
			code: null,
			timedOut: true,
		});

		expect(error.message).toBe("SSH command timed out after 30 seconds.");
		expect(error.message).not.toContain("/tmp/ztnet-ssh-");
		expect(error.timedOut).toBe(true);
	});

	it("preserves a safe remote SSH error detail", () => {
		const error = new RemoteRootSshError({
			stderr: "root@203.0.113.10: Permission denied (publickey).",
			code: 255,
			timedOut: false,
		});

		expect(error.message).toBe("root@203.0.113.10: Permission denied (publickey).");
		expect(error.code).toBe(255);
	});
});
