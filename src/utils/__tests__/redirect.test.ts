import { safeInternalPath } from "../redirect";

const FALLBACK = "/auth/register";

describe("safeInternalPath", () => {
	it.each([
		["/auth/login", "/auth/login"],
		["/network/abc123", "/network/abc123"],
		["/auth/register?invite=token", "/auth/register?invite=token"],
		["/organization/1#members", "/organization/1#members"],
		["/", "/"],
	])("keeps the internal path %p", (value, expected) => {
		expect(safeInternalPath(value, FALLBACK)).toBe(expected);
	});

	it.each([
		["absolute URL", "https://evil.example/login"],
		["javascript scheme", "javascript:alert(1)"],
		["relative path", "auth/login"],
		["protocol-relative URL", "//evil.example"],
		["backslash after slash", "/\\evil.example"],
		["backslash later in the path", "/auth\\..\\..\\evil.example"],
		["tab between slashes", "/\t/evil.example"],
		["newline between slashes", "/\n/evil.example"],
		["carriage return between slashes", "/\r/evil.example"],
		["dot segment collapsing to //", "/.//evil.example"],
		["parent segment collapsing to //", "/..//evil.example"],
		["empty string", ""],
	])("falls back for %s", (_name, value) => {
		expect(safeInternalPath(value, FALLBACK)).toBe(FALLBACK);
	});

	it.each([
		["undefined", undefined],
		["array", ["/auth/login", "//evil.example"]],
		["number", 42],
		["null", null],
	])("falls back for non-string input: %s", (_name, value) => {
		expect(safeInternalPath(value, FALLBACK)).toBe(FALLBACK);
	});

	it("never returns a path the browser resolves to another origin", () => {
		const origin = "https://ztnet.example";
		const inputs = [
			"/\t/evil.example",
			"/.//evil.example",
			"/%2F/evil.example",
			"/a/../..//evil.example",
			"/\\/evil.example",
			"/ok/path?next=//evil.example",
		];
		for (const input of inputs) {
			const result = safeInternalPath(input, FALLBACK);
			expect(new URL(result, origin).origin).toBe(origin);
		}
	});
});
