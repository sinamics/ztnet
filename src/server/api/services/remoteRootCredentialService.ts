import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { decrypt, encrypt, generateInstanceSecret } from "~/utils/encryption";

export const REMOTE_ROOT_SSH_SECRET = "_ztnet_remote_root_ssh";

export function encryptRemoteRootPrivateKey(privateKey: string): string {
	return encrypt(privateKey, generateInstanceSecret(REMOTE_ROOT_SSH_SECRET));
}

export function decryptRemoteRootPrivateKey(encryptedPrivateKey: string): string {
	return decrypt<string>(
		encryptedPrivateKey,
		generateInstanceSecret(REMOTE_ROOT_SSH_SECRET),
	);
}

export function buildRemoteRootNodeCreateData<
	TInput extends {
		name: string;
		host: string;
		sshPort: number;
		sshUser: string;
		endpointSource: "MANUAL_IP" | "DOMAIN";
		domainName?: string | null;
		selectedIp?: string | null;
		selectedIps?: string[];
		primaryPort: number;
		enabled?: boolean;
	},
>(
	input: TInput,
	generateKeyPair: typeof generateManagedSshKeyPair = generateManagedSshKeyPair,
) {
	const pair = generateKeyPair();
	return {
		...input,
		credential: {
			create: {
				encryptedPrivateKey: encryptRemoteRootPrivateKey(pair.privateKey),
				publicKey: pair.publicKey,
			},
		},
	};
}

export function generateManagedSshKeyPair(): {
	privateKey: string;
	publicKey: string;
} {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ztnet-remote-root-key-"));
	const keyPath = path.join(dir, "id_ed25519");

	try {
		execFileSync("ssh-keygen", [
			"-t",
			"ed25519",
			"-N",
			"",
			"-C",
			"ztnet-remote-root",
			"-f",
			keyPath,
		]);

		return {
			privateKey: fs.readFileSync(keyPath, "utf8"),
			publicKey: fs.readFileSync(`${keyPath}.pub`, "utf8").trim(),
		};
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}
