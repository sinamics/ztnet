import {
	buildRemoteRootPlanetEntry,
	normalizePlanetRootNodes,
} from "~/server/api/services/remoteRootPlanetService";

describe("remoteRootPlanetService", () => {
	const identity =
		"992fcf1db7:0:206ed59350b31916f749a1f85dffb3a8787dcbf83b8c6e9448d4e3ea0e3369301be716c3609344a9d1533850fb4460c50af43322bcfc8e13d3301a1f1003ceb6";

	it("builds a planet root entry using the selected IP and port", () => {
		const entry = buildRemoteRootPlanetEntry({
			name: "root-a",
			identity,
			selectedIp: "203.0.113.10",
			primaryPort: 9993,
			domainName: "root.example.com",
		});

		expect(entry).toEqual({
			comments: "root-a",
			identity,
			endpoints: ["203.0.113.10/9993"],
		});
	});

	it("builds a planet root entry with multiple selected IPv4 and IPv6 endpoints", () => {
		const entry = buildRemoteRootPlanetEntry({
			name: "root-a",
			identity,
			selectedIps: ["203.0.113.10", "2001:db8::10", "203.0.113.10"],
			primaryPort: 10001,
		});

		expect(entry).toEqual({
			comments: "root-a",
			identity,
			endpoints: ["203.0.113.10/10001", "2001:db8::10/10001"],
		});
	});

	it("falls back to the legacy selected IP when selectedIps is empty", () => {
		const entry = buildRemoteRootPlanetEntry({
			name: "root-a",
			identity,
			selectedIp: "203.0.113.10",
			selectedIps: [],
			primaryPort: 9993,
		});

		expect(entry.endpoints).toEqual(["203.0.113.10/9993"]);
	});

	it("never writes domain names into planet endpoints", () => {
		const entry = buildRemoteRootPlanetEntry({
			name: "root-a",
			identity,
			selectedIp: "203.0.113.10",
			primaryPort: 9993,
			domainName: "root.example.com",
		});

		expect(entry.endpoints.join(",")).not.toContain("root.example.com");
	});

	it("rejects nodes without an identity", () => {
		expect(() =>
			buildRemoteRootPlanetEntry({
				name: "root-a",
				identity: "",
				selectedIp: "203.0.113.10",
				primaryPort: 9993,
			}),
		).toThrow(/identity/i);
	});

	it("rejects nodes without a selected IP", () => {
		expect(() =>
			buildRemoteRootPlanetEntry({
				name: "root-a",
				identity,
				selectedIp: "",
				primaryPort: 9993,
			}),
		).toThrow(/selected ip/i);
	});

	it("rejects invalid selected endpoint IPs in a list", () => {
		expect(() =>
			buildRemoteRootPlanetEntry({
				name: "root-a",
				identity,
				selectedIps: ["203.0.113.10", "root.example.com"],
				primaryPort: 9993,
			}),
		).toThrow(/IPv4 or IPv6/i);
	});

	it("keeps a remote-only first root instead of replacing it with local identity", () => {
		const roots = normalizePlanetRootNodes([
			{
				comments: "remote-first",
				identity,
				endpoints: ["203.0.113.10/9993"],
			},
		]);

		expect(roots).toEqual([
			{
				comments: "remote-first",
				identity,
				endpoints: ["203.0.113.10/9993"],
			},
		]);
	});

	it("requires at least one planet root node", () => {
		expect(() => normalizePlanetRootNodes([])).toThrow(/at least one/i);
	});
});
