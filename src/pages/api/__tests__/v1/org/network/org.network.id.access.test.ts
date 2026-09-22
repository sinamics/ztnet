import { NextApiRequest, NextApiResponse } from "next";
import apiOrgNetworkByIdHandler from "~/pages/api/v1/org/[orgid]/network/[nwid]";
import apiOrgNetworkMembersHandler from "~/pages/api/v1/org/[orgid]/network/[nwid]/member";
import { prisma } from "~/server/db";
import * as encryptionModule from "~/utils/encryption";
import * as ztController from "~/utils/ztApi";

jest.mock("~/utils/encryption", () => {
	const originalModule = jest.requireActual("~/utils/encryption");
	return { ...originalModule, decryptAndVerifyToken: jest.fn() };
});

jest.mock("~/utils/ztApi", () => {
	const originalModule = jest.requireActual("~/utils/ztApi");
	return {
		...originalModule,
		local_network_and_membercount: jest.fn(),
		network_update: jest.fn(),
	};
});

// The update handler reads the network back through the tRPC caller, which
// would need a database and a controller. The role gate under test sits in
// the route wrapper, before the handler runs, so the caller is stubbed.
jest.mock("~/server/api/root", () => ({
	appRouter: {
		createCaller: jest.fn(() => ({
			network: {
				getNetworkById: jest.fn().mockResolvedValue({ network: { id: "stub" } }),
				setFlowRule: jest.fn(),
				deleteNetwork: jest.fn(),
			},
		})),
	},
}));

jest.mock("~/utils/rateLimit", () => ({
	__esModule: true,
	default: jest.fn(() => ({ check: jest.fn().mockResolvedValue(null) })),
	RATE_LIMIT_CONFIG: { API_WINDOW_MS: 60 * 1000, API_MAX_REQUESTS: 50 },
}));

// Two organizations on the same instance. The caller is a member of ORG_A only.
const ORG_A = "orgA";
const ORG_B = "orgB";
const NETWORK_IN_ORG_A = "1111111111111111";
const NETWORK_IN_ORG_B = "2222222222222222";
const CALLER_USER_ID = "callerUserId";

const NETWORK_OWNER: Record<string, string> = {
	[NETWORK_IN_ORG_A]: ORG_A,
	[NETWORK_IN_ORG_B]: ORG_B,
};

const buildResponse = () =>
	({
		status: jest.fn().mockReturnThis(),
		json: jest.fn(),
		end: jest.fn(),
		setHeader: jest.fn(),
	}) as unknown as NextApiResponse;

const buildRequest = (orgid: string, nwid: string, method = "GET") =>
	({
		method,
		headers: { "x-ztnet-auth": "callerOrgToken" },
		query: { orgid, nwid },
		body: {},
	}) as unknown as NextApiRequest;

// The caller holds the given role in ORG_A only, and no role anywhere else.
const setCallerRole = (role: string | null) => {
	prisma.userOrganizationRole.findFirst = jest
		.fn()
		.mockImplementation(({ where }) =>
			Promise.resolve(
				where.organizationId === ORG_A && where.userId === CALLER_USER_ID && role
					? { role }
					: null,
			),
		);
};

describe("organization network access scoping", () => {
	beforeEach(() => {
		jest.clearAllMocks();

		(encryptionModule.decryptAndVerifyToken as jest.Mock).mockResolvedValue({
			userId: CALLER_USER_ID,
			tokenId: "tokenId",
		});

		setCallerRole("READ_ONLY");

		// Stands in for the network table: a row is only returned when the
		// requested organizationId actually owns the requested nwid.
		prisma.network.findFirst = jest
			.fn()
			.mockImplementation(({ where }) =>
				Promise.resolve(
					NETWORK_OWNER[where.nwid] === where.organizationId
						? { nwid: where.nwid, description: `description of ${where.nwid}` }
						: null,
				),
			);

		prisma.network.update = jest.fn();

		(ztController.local_network_and_membercount as jest.Mock).mockResolvedValue({
			network: {
				id: NETWORK_IN_ORG_B,
				name: "orgB-prod",
				private: true,
				routes: [{ target: "10.9.0.0/24" }],
				dns: { domain: "orgb.internal", servers: ["10.9.0.1"] },
			},
			memberCount: 42,
		});
	});

	it("rejects GET for a network owned by another organization", async () => {
		const res = buildResponse();

		await apiOrgNetworkByIdHandler(buildRequest(ORG_A, NETWORK_IN_ORG_B), res);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			error: "Network not found or access denied.",
		});
		// The other organization's configuration must not be fetched from the controller.
		expect(ztController.local_network_and_membercount).not.toHaveBeenCalled();
	});

	it("rejects POST for a network owned by another organization", async () => {
		// A role that may update networks in ORG_A, so the rejection below comes
		// from the network scoping and not from the role floor.
		setCallerRole("USER");
		const res = buildResponse();

		await apiOrgNetworkByIdHandler(buildRequest(ORG_A, NETWORK_IN_ORG_B, "POST"), res);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			error: "Network not found or access denied.",
		});
		expect(ztController.network_update).not.toHaveBeenCalled();
	});

	it("rejects the member listing for a network owned by another organization", async () => {
		const res = buildResponse();

		await apiOrgNetworkMembersHandler(buildRequest(ORG_A, NETWORK_IN_ORG_B), res);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			error: "Network not found or access denied.",
		});
	});

	it("still serves a network the organization actually owns", async () => {
		const res = buildResponse();

		await apiOrgNetworkByIdHandler(buildRequest(ORG_A, NETWORK_IN_ORG_A), res);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				description: `description of ${NETWORK_IN_ORG_A}`,
			}),
		);
	});

	describe("role floor for updating a network", () => {
		const buildUpdateRequest = () =>
			({
				...buildRequest(ORG_A, NETWORK_IN_ORG_A, "POST"),
				body: { private: false },
			}) as unknown as NextApiRequest;

		beforeEach(() => {
			(ztController.network_update as jest.Mock).mockResolvedValue({});
		});

		it("rejects POST from a READ_ONLY member of the owning organization", async () => {
			setCallerRole("READ_ONLY");
			const res = buildResponse();

			await apiOrgNetworkByIdHandler(buildUpdateRequest(), res);

			expect(res.status).not.toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({
				message: expect.stringContaining("required permission"),
			});
			expect(ztController.network_update).not.toHaveBeenCalled();
			expect(prisma.network.update).not.toHaveBeenCalled();
		});

		it("rejects POST from a user with no role in the organization", async () => {
			setCallerRole(null);
			const res = buildResponse();

			await apiOrgNetworkByIdHandler(buildUpdateRequest(), res);

			expect(res.status).not.toHaveBeenCalledWith(200);
			expect(ztController.network_update).not.toHaveBeenCalled();
		});

		it.each(["USER", "MODERATOR", "ADMIN"])(
			"accepts POST from a %s member",
			async (role) => {
				setCallerRole(role);
				const res = buildResponse();

				await apiOrgNetworkByIdHandler(buildUpdateRequest(), res);

				expect(res.status).toHaveBeenCalledWith(200);
				expect(ztController.network_update).toHaveBeenCalledWith(
					expect.objectContaining({
						nwid: NETWORK_IN_ORG_A,
						updateParams: { private: false },
					}),
				);
			},
		);

		it("still lets a READ_ONLY member read the network", async () => {
			setCallerRole("READ_ONLY");
			const res = buildResponse();

			await apiOrgNetworkByIdHandler(buildRequest(ORG_A, NETWORK_IN_ORG_A), res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(ztController.network_update).not.toHaveBeenCalled();
		});
	});

	it("scopes the network lookup by organization, not by nwid alone", async () => {
		const res = buildResponse();

		await apiOrgNetworkByIdHandler(buildRequest(ORG_A, NETWORK_IN_ORG_A), res);

		for (const [args] of (prisma.network.findFirst as jest.Mock).mock.calls) {
			expect(args.where).toEqual(
				expect.objectContaining({ organizationId: ORG_A, nwid: NETWORK_IN_ORG_A }),
			);
		}
	});
});
