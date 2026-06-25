import { classifyRemoteRootPlanetStatus } from "~/server/api/services/remoteRootPlanetStatusService";

describe("remoteRootPlanetStatusService", () => {
	it("classifies a restored official backup as official instead of custom other", () => {
		expect(
			classifyRemoteRootPlanetStatus({
				remotePlanetHash: "official-hash",
				remoteOfficialPlanetHash: "official-hash",
				localCustomPlanetHash: "custom-hash",
			}),
		).toBe("OFFICIAL_RESTORED");
	});

	it("classifies a removed custom planet as default official when no backup exists", () => {
		expect(
			classifyRemoteRootPlanetStatus({
				remotePlanetHash: null,
				remoteOfficialPlanetHash: null,
				localCustomPlanetHash: "custom-hash",
				restoreMode: "custom_removed",
			}),
		).toBe("OFFICIAL_OR_DEFAULT");
	});

	it("classifies only a different remote planet as custom other", () => {
		expect(
			classifyRemoteRootPlanetStatus({
				remotePlanetHash: "other-custom",
				remoteOfficialPlanetHash: "official-hash",
				localCustomPlanetHash: "custom-hash",
			}),
		).toBe("CUSTOM_OTHER");
	});
});
