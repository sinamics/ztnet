import {
	detectDnsDrift,
	normalizeResolvedIps,
} from "~/server/api/services/remoteRootDnsService";

describe("remoteRootDnsService", () => {
	it("normalizes resolved IPs by removing duplicates and sorting", () => {
		expect(normalizeResolvedIps(["2001:db8::1", "203.0.113.10", "203.0.113.10"])).toEqual(
			["2001:db8::1", "203.0.113.10"],
		);
	});

	it("marks a selected IP as unchanged when DNS still contains it", () => {
		expect(
			detectDnsDrift({
				selectedIp: "203.0.113.10",
				resolvedIps: ["203.0.113.11", "203.0.113.10"],
			}),
		).toEqual({ drifted: false, reason: null });
	});

	it("marks a selected IP as drifted when DNS no longer contains it", () => {
		expect(
			detectDnsDrift({
				selectedIp: "203.0.113.10",
				resolvedIps: ["203.0.113.11"],
			}),
		).toEqual({
			drifted: true,
			reason: "Selected IP is no longer present in DNS answers.",
		});
	});
});
