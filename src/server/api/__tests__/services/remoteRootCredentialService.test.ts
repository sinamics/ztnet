import {
	REMOTE_ROOT_SSH_SECRET,
	buildRemoteRootNodeCreateData,
	decryptRemoteRootPrivateKey,
	encryptRemoteRootPrivateKey,
} from "~/server/api/services/remoteRootCredentialService";

describe("remoteRootCredentialService", () => {
	it("uses a dedicated encryption context for remote root SSH keys", () => {
		expect(REMOTE_ROOT_SSH_SECRET).toBe("_ztnet_remote_root_ssh");
	});

	it("round-trips an SSH private key through encryption", () => {
		process.env.NEXTAUTH_SECRET = "test_secret";
		const privateKey =
			"-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----";

		const encrypted = encryptRemoteRootPrivateKey(privateKey);
		expect(encrypted).not.toContain(privateKey);
		expect(decryptRemoteRootPrivateKey(encrypted)).toBe(privateKey);
	});

	it("builds remote root create data with an auto-generated managed SSH key", () => {
		process.env.NEXTAUTH_SECRET = "test_secret";
		const privateKey =
			"-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----";
		const data = buildRemoteRootNodeCreateData(
			{
				name: "Tokyo Root",
				host: "203.0.113.10",
				sshPort: 22,
				sshUser: "root",
				endpointSource: "MANUAL_IP",
				domainName: null,
				selectedIp: null,
				primaryPort: 9993,
				enabled: true,
			},
			() => ({
				privateKey,
				publicKey: "ssh-ed25519 public ztnet-remote-root",
			}),
		);

		expect(data.credential.create.publicKey).toBe("ssh-ed25519 public ztnet-remote-root");
		expect(data.credential.create.encryptedPrivateKey).not.toContain(privateKey);
		expect(decryptRemoteRootPrivateKey(data.credential.create.encryptedPrivateKey)).toBe(
			privateKey,
		);
	});
});
