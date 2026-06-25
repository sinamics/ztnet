import de from "~/locales/de/common.json";
import en from "~/locales/en/common.json";
import es from "~/locales/es/common.json";
import fr from "~/locales/fr/common.json";
import no from "~/locales/no/common.json";
import pl from "~/locales/pl/common.json";
import ru from "~/locales/ru/common.json";
import ua from "~/locales/ua/common.json";
import zhTw from "~/locales/zh-tw/common.json";
import zh from "~/locales/zh/common.json";

const localeMessages = {
	de,
	en,
	es,
	fr,
	no,
	pl,
	ru,
	ua,
	"zh-tw": zhTw,
	zh,
};

const requiredRemoteRootKeys = [
	"title",
	"description",
	"actions.appendHealthyRoots",
	"actions.close",
	"actions.saveEndpoint",
	"sections.connection",
	"sections.zerotier",
	"sections.endpoint",
	"sections.planet",
	"values.yes",
	"values.no",
	"form.namePlaceholder",
	"form.hostPlaceholder",
	"form.sshUserPlaceholder",
	"form.sshPortPlaceholder",
	"form.endpointSource.manualIp",
	"form.endpointSource.domain",
	"form.addRoot",
	"form.domainNamePlaceholder",
	"form.selectedIpPlaceholder",
	"form.primaryPortPlaceholder",
	"form.secondaryPortLabel",
	"form.allowSecondaryPortLabel",
	"form.interfacePrefixBlacklistLabel",
	"form.bindAddressesLabel",
	"form.allowManagementFromLabel",
	"form.defaultBondingPolicyLabel",
	"form.multithreadedLabel",
	"form.linuxKernelModeLabel",
	"form.readRequired",
	"form.sshFailedReadRequired",
	"form.zerotierInstallRequired",
	"form.configReadAt",
	"form.configSnapshotHint",
	"form.errors.required",
	"form.errors.domainRequired",
	"form.errors.portRange",
	"table.name",
	"table.host",
	"table.endpoint",
	"table.status",
	"table.identity",
	"table.actions",
	"table.identityNotRead",
	"table.installed",
	"table.portMapping",
	"table.empty",
	"table.emptyTitle",
	"table.emptyDescription",
	"table.checking",
	"status.ssh.UNKNOWN",
	"status.ssh.CHECKING",
	"status.ssh.OK",
	"status.ssh.FAILED",
	"status.panel.UNKNOWN",
	"status.panel.CHECKING",
	"status.panel.OK",
	"status.panel.DEGRADED",
	"status.panel.FAILED",
	"status.planet.UNKNOWN",
	"status.planet.MISSING",
	"status.planet.CUSTOM_MATCH",
	"status.planet.CUSTOM_OTHER",
	"status.planet.OFFICIAL_RESTORED",
	"status.planet.OFFICIAL_OR_DEFAULT",
	"status.planet.OFFICIAL_OR_UNKNOWN",
	"status.startup.UNKNOWN",
	"status.startup.ENABLED",
	"status.startup.DISABLED",
	"status.startup.ERROR",
	"status.service.UNKNOWN",
	"status.service.RUNNING",
	"status.service.STOPPED",
	"status.service.ERROR",
	"status.config.UNKNOWN",
	"row.endpointIpPlaceholder",
	"row.udpPortSuffix",
	"row.actions.connectRead",
	"row.actions.test",
	"row.actions.install",
	"row.actions.upgrade",
	"row.actions.restart",
	"row.actions.saveConfig",
	"row.actions.addEndpoint",
	"row.actions.changePort",
	"row.actions.distributePlanet",
	"row.actions.restoreOfficial",
	"row.actions.read",
	"row.actions.check",
	"row.actions.dns",
	"row.actions.delete",
	"tasks.title",
	"tasks.noLogs",
	"tasks.publicKeyTitle",
	"tasks.publicKeyDescription",
	"tasks.copyPublicKey",
	"tasks.publicKeyCopied",
	"toast.remoteRootSaved",
	"toast.healthCheckStarted",
	"toast.sshSucceeded",
	"toast.installCompleted",
	"toast.upgradeCompleted",
	"toast.remoteConfigRead",
	"toast.restartCompleted",
	"toast.portChanged",
	"toast.configSaved",
	"toast.planetDistributed",
	"toast.officialPlanetRestored",
	"toast.noDnsRecords",
	"toast.noHealthyRoots",
	"toast.customPlanetUpdated",
];

const getNestedValue = (source: unknown, path: string): unknown =>
	path.split(".").reduce<unknown>((current, segment) => {
		if (!current || typeof current !== "object") {
			return undefined;
		}
		return (current as Record<string, unknown>)[segment];
	}, source);

describe("remote root translations", () => {
	it("defines every remote root UI key for all supported locale files", () => {
		for (const [locale, messages] of Object.entries(localeMessages)) {
			for (const key of requiredRemoteRootKeys) {
				const value = getNestedValue(messages, `admin.controller.remoteRoots.${key}`);
				if (typeof value !== "string" || value.length === 0) {
					throw new Error(`${locale} is missing admin.controller.remoteRoots.${key}`);
				}
			}
		}
	});

	it("translates key remote root labels in Chinese locales instead of reusing English", () => {
		for (const key of [
			"actions.close",
			"actions.saveEndpoint",
			"form.errors.required",
			"table.emptyTitle",
			"row.actions.connectRead",
			"row.actions.restoreOfficial",
			"toast.healthCheckStarted",
			"sections.connection",
			"status.ssh.OK",
			"status.panel.DEGRADED",
			"status.startup.ENABLED",
			"values.yes",
		]) {
			const english = getNestedValue(en, `admin.controller.remoteRoots.${key}`);
			expect(getNestedValue(zh, `admin.controller.remoteRoots.${key}`)).not.toBe(english);
			expect(getNestedValue(zhTw, `admin.controller.remoteRoots.${key}`)).not.toBe(
				english,
			);
		}
	});
});
