import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type SshCommandInput = {
	host: string;
	port: number;
	user: string;
	identityFile: string;
	command: string;
	connectTimeoutSeconds?: number;
};

export type SshCommandResult = {
	stdout: string;
	stderr: string;
};

export function buildSshArgs({
	host,
	port,
	user,
	identityFile,
	command,
	connectTimeoutSeconds = 15,
}: SshCommandInput): string[] {
	if (command.includes("\n") || command.includes("\r")) {
		throw new Error("SSH multiline commands are not allowed.");
	}

	return [
		"-i",
		identityFile,
		"-p",
		String(port),
		"-o",
		"BatchMode=yes",
		"-o",
		"StrictHostKeyChecking=accept-new",
		"-o",
		`ConnectTimeout=${connectTimeoutSeconds}`,
		`${user}@${host}`,
		command,
	];
}

export async function withTempIdentityFile<T>(
	privateKey: string,
	callback: (identityFile: string) => Promise<T>,
): Promise<T> {
	const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "ztnet-ssh-"));
	const identityFile = path.join(dir, "id_ed25519");
	try {
		await fs.promises.writeFile(identityFile, privateKey, { mode: 0o600 });
		return await callback(identityFile);
	} finally {
		await fs.promises.rm(dir, { recursive: true, force: true });
	}
}

export async function executeSshCommand(
	input: Omit<SshCommandInput, "identityFile"> & { privateKey: string },
): Promise<SshCommandResult> {
	return await withTempIdentityFile(input.privateKey, async (identityFile) => {
		const { stdout, stderr } = await execFileAsync(
			"ssh",
			buildSshArgs({ ...input, identityFile }),
			{
				timeout: 30_000,
				maxBuffer: 1024 * 1024,
			},
		);
		return { stdout, stderr };
	});
}
