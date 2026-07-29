import {
	buildRemoteRootReadLogs,
	formatRemoteRootTaskLogLine,
} from "~/server/api/services/remoteRootTaskLogService";

describe("remoteRootTaskLogService", () => {
	it("builds readable read logs instead of raw JSON payloads", () => {
		const logs = buildRemoteRootReadLogs({
			prefix: "Remote config read.",
			node: {
				primaryPort: 10001,
				zerotierVersion: "1.16.2",
				serviceStatus: "RUNNING",
				startupStatus: "ENABLED",
				selectedIp: "203.0.113.20",
				identity:
					"685a4651a7:0:755f89d16ea85e0f5a9db1cdd7f4846b73b193378cc17600a7261053409f08299f6cb516dfd566359c48073af8b6ae831f996745d5e10d18dc4dd487b8ad11e3",
			},
		});

		expect(logs).toEqual([
			"Remote config read.",
			"Read ZeroTier 1.16.2, service running, startup enabled.",
			"Detected UDP port 10001.",
			"Selected endpoint 203.0.113.20.",
			"Node ID 685a4651a7.",
		]);
		expect(logs.join("\n")).not.toContain('"primaryPort"');
	});

	it("summarizes legacy JSON task logs into readable lines", () => {
		expect(
			formatRemoteRootTaskLogLine(
				JSON.stringify({
					primaryPort: 10001,
					zerotierVersion: "1.16.2",
					serviceStatus: "RUNNING",
					startupStatus: "ENABLED",
				}),
			),
		).toBe("Read ZeroTier 1.16.2, service running, startup enabled. UDP port 10001.");
	});
});
