/**
 * Instance level settings are for admins only. Hiding a form in the UI does
 * not protect the endpoint behind it, so these tests call the procedures
 * directly as a regular user and as a visitor without a session.
 */
jest.mock("~/utils/docker", () => ({ isRunningInDocker: () => true }));
jest.mock("~/utils/rateLimit", () => () => ({
	check: jest.fn().mockResolvedValue(true),
}));
jest.mock("~/utils/mail", () => ({
	sendMailWithTemplate: jest.fn(),
	mailTemplateMap: {},
}));
jest.mock("~/utils/ztApi", () => ({
	ZT_FOLDER: "/var/lib/zerotier-one",
	ping_api: jest.fn(),
	clearCentralCredentialsCache: jest.fn(),
}));
jest.mock("~/server/db", () => ({
	prisma: {
		controllerOptions: {
			findUnique: jest.fn(),
			updateMany: jest.fn(),
			upsert: jest.fn(),
		},
		globalOptions: { findFirst: jest.fn() },
		user: { findFirst: jest.fn(), update: jest.fn() },
		userOptions: { upsert: jest.fn() },
	},
}));

import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import type { Session } from "~/lib/authTypes";
import { clearControllerOptionsCache } from "~/server/api/services/controllerOptionsService";

const findControllerOptions = prisma.controllerOptions.findUnique as jest.Mock;
const upsertControllerOptions = prisma.controllerOptions.upsert as jest.Mock;
const findGlobalOptions = prisma.globalOptions.findFirst as jest.Mock;
const findUser = prisma.user.findFirst as jest.Mock;
const updateUser = prisma.user.update as jest.Mock;

const callerAs = (role: "ADMIN" | "USER" | null) =>
	appRouter.createCaller({
		session: role ? ({ user: { id: `id-${role}`, role } } as unknown as Session) : null,
		wss: null,
		prisma: prisma as never,
		res: null,
		req: null,
	});

type AnyProcedure = (input?: unknown) => Promise<unknown>;
type AnyRouter = Record<string, Record<string, AnyProcedure>>;

const procedureNames = (router: string) =>
	Object.keys(appRouter._def.procedures)
		.filter((path) => path.startsWith(`${router}.`))
		.map((path) => path.slice(router.length + 1));

const ENV_KEYS = ["ZT_ADDR", "ZT_SECRET"] as const;
const ENV_BACKUP = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

beforeEach(() => {
	clearControllerOptionsCache();
	for (const key of ENV_KEYS) delete process.env[key];
	findControllerOptions.mockReset().mockResolvedValue(null);
	upsertControllerOptions.mockReset().mockResolvedValue({});
	findGlobalOptions.mockReset();
	findUser.mockReset();
	updateUser.mockReset();
});

afterAll(() => {
	for (const [key, value] of Object.entries(ENV_BACKUP)) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
});

describe("admin router", () => {
	const adminProcedures = procedureNames("admin");

	it("exposes procedures to check", () => {
		expect(adminProcedures).toContain("setControllerOptions");
		expect(adminProcedures.length).toBeGreaterThan(30);
	});

	// The role check runs before input validation, so no input is needed. A
	// procedure added to this router without the admin guard fails here.
	it.each(adminProcedures)("%s rejects a regular user", async (name) => {
		const caller = callerAs("USER") as unknown as AnyRouter;
		await expect(caller.admin[name]()).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	it.each(adminProcedures)("%s rejects a visitor without a session", async (name) => {
		const caller = callerAs(null) as unknown as AnyRouter;
		await expect(caller.admin[name]()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	it.each(["createOrg", "deleteOrg", "getAllOrg"])(
		"org.%s rejects a regular user",
		async (name) => {
			const caller = callerAs("USER") as unknown as AnyRouter;
			await expect(caller.org[name]()).rejects.toMatchObject({ code: "FORBIDDEN" });
		},
	);
});

describe("local controller settings", () => {
	it("cannot be changed through a user level procedure any more", () => {
		expect(procedureNames("auth")).not.toContain("setLocalZt");
		expect(procedureNames("auth")).toContain("setZtApi");
	});

	it("are not writable by a regular user", async () => {
		await expect(
			callerAs("USER").admin.setControllerOptions({
				localControllerUrl: "http://attacker.example",
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(upsertControllerOptions).not.toHaveBeenCalled();
	});

	it("are saved by an admin, normalized and with the secret encrypted", async () => {
		await callerAs("ADMIN").admin.setControllerOptions({
			localControllerUrl: " http://10.20.30.40:9993/ ",
			localControllerSecret: " token ",
		});

		const { update } = upsertControllerOptions.mock.calls[0][0];
		expect(update.localControllerUrl).toBe("http://10.20.30.40:9993");
		expect(update.localControllerSecret).toMatch(/^[0-9a-f]{32}:[0-9a-f]+$/);
	});

	it("only change the field that was submitted", async () => {
		await callerAs("ADMIN").admin.setControllerOptions({ localControllerSecret: "" });

		expect(upsertControllerOptions.mock.calls[0][0].update).toEqual({
			localControllerSecret: null,
		});
	});

	it("reject a URL the controller requests cannot use", async () => {
		await expect(
			callerAs("ADMIN").admin.setControllerOptions({
				localControllerUrl: "http://zerotier:9993/?x=",
			}),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(upsertControllerOptions).not.toHaveBeenCalled();
	});

	it("cannot be changed while the environment variable is in charge", async () => {
		process.env.ZT_ADDR = "http://env-controller:9993";
		process.env.ZT_SECRET = "env-token";
		const admin = callerAs("ADMIN");

		await expect(
			admin.admin.setControllerOptions({ localControllerUrl: "http://a:9993" }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		await expect(
			admin.admin.setControllerOptions({ localControllerSecret: "token" }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(upsertControllerOptions).not.toHaveBeenCalled();
	});

	it("never return the stored secret, only whether one is set", async () => {
		await callerAs("ADMIN").admin.setControllerOptions({
			localControllerUrl: "http://10.20.30.40:9993",
			localControllerSecret: "token",
		});
		const { update } = upsertControllerOptions.mock.calls[0][0];
		findControllerOptions.mockResolvedValue({ id: 1, ...update });

		const options = await callerAs("ADMIN").admin.getControllerOptions();

		expect(options).toEqual({
			localControllerUrl: "http://10.20.30.40:9993",
			defaultLocalControllerUrl: "http://zerotier:9993",
			hasLocalControllerSecret: true,
			urlFromEnv: false,
			secretFromEnv: false,
		});
		expect(JSON.stringify(options)).not.toContain("token");
	});
});

describe("what a regular user can read", () => {
	it("auth.me leaves the old per user controller columns in the database", async () => {
		findUser.mockResolvedValue({ id: "id-USER", options: { id: 1 } });

		await callerAs("USER").auth.me();

		expect(findUser.mock.calls[0][0].include.options).toEqual({
			omit: { localControllerUrl: true, localControllerSecret: true },
		});
	});

	it("auth.setZtApi does not echo them back either", async () => {
		updateUser.mockResolvedValue({ id: "id-USER", options: {} });

		await callerAs("USER").auth.setZtApi({ ztCentralApiKey: "" });

		expect(updateUser.mock.calls[0][0].include.options).toEqual({
			omit: { localControllerUrl: true, localControllerSecret: true },
		});
	});

	it("settings.getAllOptions only selects the site name", async () => {
		findGlobalOptions.mockResolvedValue({ siteName: "ZTNET" });

		await expect(callerAs("USER").settings.getAllOptions()).resolves.toEqual({
			siteName: "ZTNET",
		});
		expect(findGlobalOptions.mock.calls[0][0].select).toEqual({ siteName: true });
	});
});
