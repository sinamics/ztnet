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

type ExecFileFailure = Error & {
	code?: number | string | null;
	killed?: boolean;
	signal?: string | null;
	stderr?: string;
};

export class RemoteRootSshError extends Error {
	readonly stderr: string;
	readonly code: number | string | null;
	readonly timedOut: boolean;

	constructor({ stderr, code, timedOut }: {
		stderr: string;
		code: number | string | null;
		timedOut: boolean;
	}) {
		const detail = stderr.trim();
		super(
			timedOut
				? "SSH command timed out after 30 seconds."
				: detail || `SSH command failed${code === null ? "." : ` with exit code ${code}.`}`,
		);
		this.name = "RemoteRootSshError";
		this.stderr = detail;
		this.code = code;
		this.timedOut = timedOut;
	}
}

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
		try {
			const { stdout, stderr } = await execFileAsync(
				"ssh",
				buildSshArgs({ ...input, identityFile }),
				{
					timeout: 30_000,
					maxBuffer: 1024 * 1024,
				},
			);
			return { stdout, stderr };
		} catch (error) {
			const failure = error as ExecFileFailure;
			throw new RemoteRootSshError({
				stderr: failure.stderr || "",
				code: failure.code ?? null,
				timedOut: Boolean(failure.killed || failure.signal === "SIGTERM"),
			});
		}
	});
}
