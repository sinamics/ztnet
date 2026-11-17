/**
 * Organization quotas through the REST API. The network quota is reached
 * through the same createOrgNetwork procedure the UI uses; the member cap and
 * the public switch have their own checks in the REST handlers.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import apiOrgNetworkHandler from "~/pages/api/v1/org/[orgid]/network";
import apiOrgNetworkByIdHandler from "~/pages/api/v1/org/[orgid]/network/[nwid]";
import apiOrgMemberHandler from "~/pages/api/v1/org/[orgid]/network/[nwid]/member/[memberId]";
import { prisma } from "~/server/db";
import * as encryptionModule from "~/utils/encryption";
import * as ztController from "~/utils/ztApi";

jest.mock("~/server/db", () => ({ prisma: {} }));

jest.mock("~/utils/encryption", () => {
	const originalModule = jest.requireActual("~/utils/encryption");
	return { ...originalModule, decryptAndVerifyToken: jest.fn() };
});

jest.mock("~/utils/ztApi", () => ({
	ZT_FOLDER: "/var/lib/zerotier-one",
	network_create: jest.fn(),
	network_delete: jest.fn(),
	network_update: jest.fn(),
	get_network: jest.fn(),
	member_update: jest.fn(),
	member_details: jest.fn(),
	local_network_and_membercount: jest.fn(),
}));

jest.mock("~/utils/webhook", () => ({ sendWebhook: jest.fn() }));
jest.mock("~/utils/organizationNotifications", () => ({
	sendOrganizationAdminNotification: jest.fn(),
}));
jest.mock("~/server/api/services/memberService", () => ({
	...jest.requireActual("~/server/api/services/memberService"),
	cacheControllerMember: jest.fn(),
	reconcileNetworkMembersOnce: jest.fn().mockResolvedValue(undefined),
	triggerBackgroundReconcile: jest.fn(),
}));

jest.mock("~/utils/rateLimit", () => ({
	__esModule: true,
	default: jest.fn(() => ({ check: jest.fn().mockResolvedValue(null) })),
	RATE_LIMIT_CONFIG: { API_WINDOW_MS: 60 * 1000, API_MAX_REQUESTS: 50 },
}));

const ORG = "org1";
const NWID = "aaaaaaaaaaaaaaaa";
const MEMBER = "bbbbbbbbbb";

// biome-ignore lint/suspicious/noExplicitAny: the database is a plain stub here
const db = prisma as any;

const setupDatabase = ({
	maxNetworks = null as number | null,
	maxMembersPerNetwork = null as number | null,
	networkCount = 0,
	authorizedCount = 0,
	member = { id: MEMBER, authorized: false, deleted: false, permanentlyDeleted: false },
} = {}) => {
	const organization = { maxMembersPerNetwork };
	Object.assign(db, {
		userOrganizationRole: { findFirst: jest.fn().mockResolvedValue({ role: "ADMIN" }) },
		activityLog: { create: jest.fn().mockResolvedValue({}) },
		organization: {
			findUnique: jest.fn().mockResolvedValue({ maxNetworks, maxMembersPerNetwork }),
			findFirst: jest.fn().mockResolvedValue({ id: ORG }),
			update: jest.fn().mockResolvedValue({}),
		},
		network: {
			count: jest.fn().mockResolvedValue(networkCount),
			findMany: jest.fn().mockResolvedValue([]),
			findFirst: jest.fn().mockResolvedValue({ nwid: NWID }),
			findUnique: jest.fn().mockResolvedValue({
				nwid: NWID,
				authorId: null,
				organizationId: ORG,
				organization,
				routes: [],
				networkMembers: [member],
			}),
			update: jest.fn().mockResolvedValue({}),
		},
		network_members: {
			count: jest.fn().mockResolvedValue(authorizedCount),
			findUnique: jest.fn().mockResolvedValue(member),
			findMany: jest.fn().mockResolvedValue([]),
			create: jest.fn(),
		},
		$queryRaw: jest.fn().mockResolvedValue([]),
		$transaction: jest.fn((run) => run(db)),
	});
};

const buildResponse = () =>
	({
		status: jest.fn().mockReturnThis(),
		json: jest.fn(),
		end: jest.fn(),
		setHeader: jest.fn(),
	}) as unknown as NextApiResponse;

const buildRequest = (query: Record<string, string>, body: unknown) =>
	({
		method: "POST",
		headers: { "x-ztnet-auth": "orgToken" },
		query,
		body,
	}) as unknown as NextApiRequest;

const contactAdmin = { error: expect.stringContaining("instance administrator") };

beforeEach(() => {
	jest.clearAllMocks();
	(encryptionModule.decryptAndVerifyToken as jest.Mock).mockResolvedValue({
		userId: "user-1",
		tokenId: "tokenId",
	});
	(ztController.network_create as jest.Mock).mockResolvedValue({ nwid: NWID, id: NWID });
	(ztController.get_network as jest.Mock).mockResolvedValue({
		nwid: NWID,
		private: true,
		routes: [],
	});
	(ztController.member_update as jest.Mock).mockResolvedValue({ id: MEMBER });
	(ztController.member_details as jest.Mock).mockResolvedValue({
		id: MEMBER,
		authorized: true,
	});
	(ztController.local_network_and_membercount as jest.Mock).mockResolvedValue({
		network: { nwid: NWID },
	});
});

describe("REST: organization network quota", () => {
	it("creates a network below the quota", async () => {
		setupDatabase({ maxNetworks: 2, networkCount: 1 });
		const res = buildResponse();
		await apiOrgNetworkHandler(buildRequest({ orgid: ORG }, { name: "one" }), res);
		expect(res.status).toHaveBeenCalledWith(200);
		expect(ztController.network_create).toHaveBeenCalledTimes(1);
	});

	it("answers 403 at the quota and creates nothing", async () => {
		setupDatabase({ maxNetworks: 2, networkCount: 2 });
		const res = buildResponse();
		await apiOrgNetworkHandler(buildRequest({ orgid: ORG }, { name: "three" }), res);
		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith(contactAdmin);
		expect(ztController.network_create).not.toHaveBeenCalled();
		expect(db.organization.update).not.toHaveBeenCalled();
	});
});

describe("REST: organization member cap", () => {
	const authorize = (body: unknown = { authorized: true }) => {
		const res = buildResponse();
		return apiOrgMemberHandler(
			buildRequest({ orgid: ORG, nwid: NWID, memberId: MEMBER }, body),
			res,
		).then(() => res);
	};

	it("authorizes a member below the cap", async () => {
		setupDatabase({ maxMembersPerNetwork: 3, authorizedCount: 2 });
		const res = await authorize();
		expect(res.status).toHaveBeenCalledWith(200);
		expect(ztController.member_update).toHaveBeenCalledTimes(1);
	});

	it("answers 403 at the cap and changes neither database nor controller", async () => {
		setupDatabase({ maxMembersPerNetwork: 3, authorizedCount: 3 });
		const res = await authorize();
		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith(contactAdmin);
		expect(ztController.member_update).not.toHaveBeenCalled();
		expect(db.network.update).not.toHaveBeenCalled();
		expect(db.network_members.create).not.toHaveBeenCalled();
	});

	it("still updates an already authorized member at the cap", async () => {
		setupDatabase({
			maxMembersPerNetwork: 3,
			authorizedCount: 3,
			member: { id: MEMBER, authorized: true, deleted: false, permanentlyDeleted: false },
		});
		const res = await authorize({ authorized: true, name: "renamed" });
		expect(res.status).toHaveBeenCalledWith(200);
		expect(ztController.member_update).toHaveBeenCalledTimes(1);
	});

	it("never blocks deauthorizing at the cap", async () => {
		setupDatabase({ maxMembersPerNetwork: 1, authorizedCount: 5 });
		const res = await authorize({ authorized: false });
		expect(res.status).toHaveBeenCalledWith(200);
	});

	const stashedAuthorized = {
		id: MEMBER,
		authorized: true,
		deleted: true,
		permanentlyDeleted: false,
	};

	it("answers 403 when a restore alone would bring an authorized member into a full network", async () => {
		setupDatabase({
			maxMembersPerNetwork: 3,
			authorizedCount: 3,
			member: stashedAuthorized,
		});
		const res = await authorize({ deleted: false });
		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith(contactAdmin);
		expect(db.network.update).not.toHaveBeenCalled();
	});

	it("restores into a full network when the same request deauthorizes", async () => {
		setupDatabase({
			maxMembersPerNetwork: 3,
			authorizedCount: 3,
			member: stashedAuthorized,
		});
		const res = await authorize({ deleted: false, authorized: false });
		expect(res.status).toHaveBeenCalledWith(200);
		expect(db.network.update).toHaveBeenCalledTimes(1);
	});

	it("restores and authorizes in one request while there is room", async () => {
		setupDatabase({
			maxMembersPerNetwork: 3,
			authorizedCount: 2,
			member: { ...stashedAuthorized, authorized: false },
		});
		const res = await authorize({ deleted: false, authorized: true });
		expect(res.status).toHaveBeenCalledWith(200);
	});
});

describe("REST: public switch under a member cap", () => {
	const update = (body: unknown) => {
		const res = buildResponse();
		return apiOrgNetworkByIdHandler(
			buildRequest({ orgid: ORG, nwid: NWID }, body),
			res,
		).then(() => res);
	};

	it("answers 403 when a capped organization network is made public", async () => {
		setupDatabase({ maxMembersPerNetwork: 5 });
		const res = await update({ private: false });
		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({
			error: expect.stringContaining("cannot be made public"),
		});
		expect(ztController.network_update).not.toHaveBeenCalled();
	});

	it("refuses before any other field of the request is applied", async () => {
		setupDatabase({ maxMembersPerNetwork: 5 });
		const res = await update({ flowRule: "accept;", private: false });
		expect(res.status).toHaveBeenCalledWith(403);
		// setFlowRule reads the network first, so nothing of it may have run.
		expect(ztController.get_network).not.toHaveBeenCalled();
		expect(ztController.network_update).not.toHaveBeenCalled();
		expect(db.network.update).not.toHaveBeenCalled();
	});

	it("allows public when the organization has no cap", async () => {
		setupDatabase();
		const res = await update({ private: false });
		expect(res.status).toHaveBeenCalledWith(200);
		expect(ztController.network_update).toHaveBeenCalledTimes(1);
	});

	it("rejects quota fields, the REST API has no way to set them", async () => {
		setupDatabase();
		const res = await update({ maxMembersPerNetwork: 999, maxNetworks: 999 });
		expect(res.status).toHaveBeenCalledWith(400);
		expect(db.organization.update).not.toHaveBeenCalled();
	});
});
