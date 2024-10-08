import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { NextApiRequest, NextApiResponse } from "next";
import apiNetworkByIdHandler from "~/pages/api/v1/network/[id]";
import { prisma } from "~/server/db";
import * as encryptionModule from "~/utils/encryption";
import * as ztController from "~/utils/ztApi";

// Mock the ztController module
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
		local_network_detail: jest.fn(),
	};
});

// Mock the rateLimit module
jest.mock("~/utils/rateLimit", () => ({
	__esModule: true, // Ensure correct handling of ES module
	default: jest.fn(() => ({
		check: jest.fn().mockResolvedValue(null), // Mock implementation of the check method
	})),
}));

describe("/api/getNetworkById", () => {
	// Reset the mocks
	beforeEach(() => {
		jest.clearAllMocks();
	});
	it("should respond 200 when network is found", async () => {
		// Mock the decryption to return a valid user ID
		(encryptionModule.decryptAndVerifyToken as jest.Mock).mockResolvedValue({
			userId: "userId",
		});

		// Mock the database to return a network
		prisma.network.findUnique = jest.fn().mockResolvedValue({
			nwid: "test_nw_id",
			nwname: "credent_second",
			authorId: "userId",
		});

		// Mock the ztController to return a network detail
		(ztController.local_network_detail as jest.Mock).mockResolvedValue({
			network: { id: "networkId", name: "networkName" },
		});

		const req = {
			method: "GET",
			headers: { "x-ztnet-auth": "validApiKey" },
			query: { id: "networkId" },
		} as unknown as NextApiRequest;

		const res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			end: jest.fn(),
			setHeader: jest.fn(), // Mock `setHeader` rate limiter uses it
		} as unknown as NextApiResponse;

		await apiNetworkByIdHandler(req, res);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({
			id: "networkId",
			name: "networkName",
			authorId: "userId",
			nwid: "test_nw_id",
			nwname: "credent_second",
		});
	});

	it("should respond 401 when network is not found", async () => {
		// Mock the decryption to return a valid user ID
		(encryptionModule.decryptAndVerifyToken as jest.Mock).mockResolvedValue({
			userId: "userId",
		});

		// Mock the database to return a network
		prisma.network.findUnique = jest.fn().mockResolvedValue(null);

		const req = {
			method: "GET",
			headers: { "x-ztnet-auth": "validApiKey" },
			query: { id: "networkId" },
		} as unknown as NextApiRequest;

		const res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			end: jest.fn(),
			setHeader: jest.fn(), // Mock `setHeader` rate limiter uses it
		} as unknown as NextApiResponse;

		await apiNetworkByIdHandler(req, res);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			error: "Network not found or access denied.",
		});
	});

	it("should respond with an error when ztController throws an error", async () => {
		// Mock the decryption to return a valid user ID
		(encryptionModule.decryptAndVerifyToken as jest.Mock).mockResolvedValue({
			userId: "ztnetUserId",
		});

		// Mock the database to return a network
		prisma.network.findUnique = jest.fn().mockResolvedValue({
			nwid: "networkId",
			name: "networkName",
			authorId: "ztnetUserId",
		});

		// Mock the ztController to throw an error
		const error = new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Internal server error",
		});

		(ztController.local_network_detail as jest.Mock).mockRejectedValue(error);

		const req = {
			method: "GET",
			headers: { "x-ztnet-auth": "validApiKey" },
			query: { id: "networkId" },
		} as unknown as NextApiRequest;

		const res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			end: jest.fn(),
			setHeader: jest.fn(), // Mock `setHeader` rate limiter uses it
		} as unknown as NextApiResponse;

		await apiNetworkByIdHandler(req, res);

		const httpCode = getHTTPStatusCodeFromError(error);
		expect(res.status).toHaveBeenCalledWith(httpCode);
		expect(res.json).toHaveBeenCalledWith({ error: error.message });
	});

	it("should respond 401 when decryptAndVerifyToken fails", async () => {
		// Mock the decryption to fail
		(encryptionModule.decryptAndVerifyToken as jest.Mock).mockRejectedValue(
			new Error("Invalid token"),
		);

		const req = {
			method: "GET",
			headers: { "x-ztnet-auth": "invalidApiKey" },
			query: { id: "networkId" },
		} as unknown as NextApiRequest;

		const res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
			end: jest.fn(),
			setHeader: jest.fn(), // Mock `setHeader` if rate limiter uses it
		} as unknown as NextApiResponse;

		await apiNetworkByIdHandler(req, res);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({ error: expect.any(String) }),
		);
	});

	it("should respond 401 when user is not the author of the network", async () => {
		// Mock the decryption to return a valid user ID
		(encryptionModule.decryptAndVerifyToken as jest.Mock).mockResolvedValue({
			userId: "userId",
		});

		const req = {
			method: "GET",
			headers: { "x-ztnet-auth": "validApiKey" },
			query: { id: "networkIdThatUserDoesNotOwn" },
		} as unknown as NextApiRequest;

		const res = {
			status: jest.fn().mockReturnThis(),
			end: jest.fn(),
			json: jest.fn().mockReturnThis(),
			setHeader: jest.fn(), // Mock `setHeader` rate limiter uses it
		} as unknown as NextApiResponse;

		// Mock the database to return a network
		prisma.network.findUnique = jest.fn().mockResolvedValue({
			nwid: "networkIdThatUserDoesNotOwn",
			nwname: "Some Network",
			authorId: "anotherUserId",
		});

		await apiNetworkByIdHandler(req, res);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			error: "Network not found or access denied.",
		});
	});
});
