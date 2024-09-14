import { NextApiRequest, NextApiResponse } from "next";
import apiNetworkUpdateMembersHandler from "~/pages/api/v1/network/[id]/member/[memberId]";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import * as encryptionModule from "~/utils/encryption";
import * as ztController from "~/utils/ztApi";

jest.mock("~/server/api/root", () => ({
	appRouter: {
		createCaller: jest.fn(() => ({
			networkMember: {
				// Mock the query method used in your authRouter
				getMemberById: jest.fn().mockImplementation(() => ({
					query: jest.fn().mockResolvedValue({}),
				})),
			},
		})),
	},
}));

// Mock the encryptionModule module
jest.mock("~/utils/encryption", () => {
	const originalModule = jest.requireActual("~/utils/encryption");
	return {
		...originalModule,
		decryptAndVerifyToken: jest.fn(),
	};
});

// Mock the ztController module
jest.mock("~/utils/ztApi", () => {
	const originalModule = jest.requireActual("~/utils/ztApi");
	return {
		...originalModule,
		member_update: jest.fn(),
		member_details: jest.fn(),
	};
});
describe("Update Network Members", () => {
	// This will run before each test in this describe block
	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		(encryptionModule.decryptAndVerifyToken as jest.Mock).mockResolvedValue({
			userId: "userId",
		});

		// Mock the database to return a network
		prisma.network.update = jest.fn().mockResolvedValue({
			nwid: "test_nw_id",
			nwname: "credent_second",
			authorId: 1,
		});

		const mockRegister = jest.fn().mockResolvedValue({ id: "memberId" });
		appRouter.createCaller = jest
			.fn()
			.mockReturnValue({ networkMember: { getMemberById: mockRegister } });

		// Mock the ztController member_update
		(ztController.member_update as jest.Mock).mockResolvedValue({
			updateParams: { id: "networkId", name: "networkName" },
		});
	});

	// Helper function to create a mock response object
	const createMockRes = () =>
		({
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			end: jest.fn(),
			setHeader: jest.fn(),
		}) as unknown as NextApiResponse;

	it("should respond 401 when member does not exist", async () => {
		const req = {
			method: "POST",
			headers: { "x-ztnet-auth": "validApiKey" },
			query: { id: "networkId", memberId: "memberId" },
			body: { name: "New Name", authorized: true },
		} as unknown as NextApiRequest;

		// Mock the database to return a network
		prisma.network.findUnique = jest.fn().mockResolvedValue({
			nwid: "test_nw_id",
			nwname: "credent_second",
			authorId: 1,
			networkMembers: [],
		});
		const res = createMockRes();

		// Call your handler
		await apiNetworkUpdateMembersHandler(req, res);

		// Assertions
		expect(res.status).toHaveBeenCalledWith(401);
	});

	it("should respond 200 when member is successfully updated", async () => {
		// Mock the database to return a network
		prisma.network.findUnique = jest.fn().mockResolvedValue({
			nwid: "test_nw_id",
			nwname: "credent_second",
			authorId: "userId",
			networkMembers: [{ id: "memberId" }],
		});

		// mock the token
		prisma.aPIToken.findUnique = jest.fn().mockResolvedValue({
			expiresAt: new Date(),
		});

		(ztController.member_details as jest.Mock).mockResolvedValue({});

		const req = {
			method: "POST",
			headers: { "x-ztnet-auth": "validApiKey" },
			query: { id: "networkId", memberId: "memberId" },
			body: { name: "New Name", authorized: true },
		} as unknown as NextApiRequest;

		const res = createMockRes();

		// Call your handler
		await apiNetworkUpdateMembersHandler(req, res);

		// Assertions
		expect(res.status).toHaveBeenCalledWith(200);
	});

	it("should respond 401 for invalid input", async () => {
		// Mock the database to return a network
		prisma.network.findUnique = jest.fn().mockResolvedValue({
			nwid: "test_nw_id",
			nwname: "credent_second",
			authorId: 1,
			networkMembers: [{ id: "memberId" }],
		});
		const req = {
			method: "POST",
			headers: { "x-ztnet-auth": "validApiKey" },
			query: { id: "networkId", memberId: "memberId" },
			body: { invalidField: "Invalid" },
		} as unknown as NextApiRequest;

		const res = createMockRes();

		// Call your handler
		await apiNetworkUpdateMembersHandler(req, res);

		// Assertions
		expect(res.status).toHaveBeenCalledWith(401);
	});

	it("should respond 401 when decryptAndVerifyToken fails", async () => {
		// Mock the decryption to fail
		(encryptionModule.decryptAndVerifyToken as jest.Mock).mockRejectedValue(
			new Error("Invalid token"),
		);

		const req = {
			method: "POST",
			headers: { "x-ztnet-auth": "invalidApiKey" },
			query: { id: "networkId", memberId: "memberId" },
			body: { name: "New Name", authorized: true },
		} as unknown as NextApiRequest;

		const res = createMockRes();

		await apiNetworkUpdateMembersHandler(req, res);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({ error: expect.any(String) }),
		);
	});

	it("should allow only POST and DELETE method", async () => {
		const methods = ["GET", "PUT", "PATCH", "OPTIONS", "HEAD"];
		const req = {} as NextApiRequest;
		const res = createMockRes();

		for (const method of methods) {
			req.method = method;
			await apiNetworkUpdateMembersHandler(req, res);

			expect(res.status).toHaveBeenCalledWith(405);

			// expect json to be called with text "Method Not Allowed"
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({ error: "Method Not Allowed" }),
			);
		}
	});
});
