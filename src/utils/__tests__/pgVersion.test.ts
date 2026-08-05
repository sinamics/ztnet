import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	listInstalledClientMajors,
	parseServerMajor,
	resolvePgDumpPath,
	selectClientMajor,
} from "../pgVersion";

describe("parseServerMajor", () => {
	it("parses server_version_num values", () => {
		expect(parseServerMajor("160014")).toBe(16);
		expect(parseServerMajor("150018")).toBe(15);
		expect(parseServerMajor("180001\n")).toBe(18);
	});

	it("returns null for invalid input", () => {
		expect(parseServerMajor("")).toBeNull();
		expect(parseServerMajor("not-a-number")).toBeNull();
		expect(parseServerMajor("16.14")).toBeNull();
		expect(parseServerMajor("-160014")).toBeNull();
	});
});

describe("selectClientMajor", () => {
	it("prefers an exact match", () => {
		expect(selectClientMajor(16, [15, 16, 17, 18])).toBe(16);
	});

	it("falls back to the closest newer client", () => {
		expect(selectClientMajor(14, [15, 16, 17, 18])).toBe(15);
		expect(selectClientMajor(16, [15, 17, 18])).toBe(17);
	});

	it("returns null when every client is older than the server", () => {
		expect(selectClientMajor(19, [15, 16, 17, 18])).toBeNull();
		expect(selectClientMajor(16, [])).toBeNull();
	});
});

describe("listInstalledClientMajors / resolvePgDumpPath", () => {
	let binRoot: string;

	const addClient = (major: number) => {
		const binDir = path.join(binRoot, String(major), "bin");
		fs.mkdirSync(binDir, { recursive: true });
		fs.writeFileSync(path.join(binDir, "pg_dump"), "");
	};

	beforeEach(() => {
		binRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pg-bin-"));
	});

	afterEach(() => {
		fs.rmSync(binRoot, { recursive: true, force: true });
	});

	it("lists only directories that contain a pg_dump binary", () => {
		addClient(15);
		addClient(17);
		fs.mkdirSync(path.join(binRoot, "16"), { recursive: true }); // no bin/pg_dump
		fs.mkdirSync(path.join(binRoot, "common"), { recursive: true });
		expect(listInstalledClientMajors(binRoot)).toEqual([15, 17]);
	});

	it("returns an empty list when the root does not exist", () => {
		expect(listInstalledClientMajors(path.join(binRoot, "missing"))).toEqual([]);
	});

	it("resolves the matching versioned binary", () => {
		addClient(15);
		addClient(16);
		expect(resolvePgDumpPath(16, binRoot)).toBe(
			path.join(binRoot, "16", "bin", "pg_dump"),
		);
	});

	it("falls back to plain pg_dump when detection failed or nothing is installed", () => {
		expect(resolvePgDumpPath(null, binRoot)).toBe("pg_dump");
		expect(resolvePgDumpPath(16, binRoot)).toBe("pg_dump");
	});

	it("throws a clear error when the server is newer than every client", () => {
		addClient(15);
		addClient(16);
		expect(() => resolvePgDumpPath(17, binRoot)).toThrow(
			/server is version 17.*newest pg_dump.*version 16/,
		);
	});
});
