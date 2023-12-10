import apiNetworkHandler from "~/pages/api/v1/network";
import { NextApiRequest, NextApiResponse } from "next";

describe("/api/createNetwork", () => {
	it("should respond 405 to unsupported methods", async () => {
		const req = { method: "PUT" } as NextApiRequest;
		const res = {
			status: jest.fn().mockReturnThis(),
			end: jest.fn(),
			json: jest.fn().mockReturnThis(),
			setHeader: jest.fn(), // Mock `setHeader` rate limiter uses it
		} as unknown as NextApiResponse;

		await apiNetworkHandler(req, res);

		expect(res.status).toHaveBeenCalledWith(405);
	});

	it("should respond 401 when invalid API key for POST", async () => {
		const req = {
			method: "POST",
			headers: { "x-ztnet-auth": "invalidApiKey" },
		} as unknown as NextApiRequest;
		const res = {
			status: jest.fn().mockReturnThis(),
			end: jest.fn(),
			json: jest.fn().mockReturnThis(),
			setHeader: jest.fn(), // Mock `setHeader` rate limiter uses it
		} as unknown as NextApiResponse;

		await apiNetworkHandler(req, res);

		expect(res.status).toHaveBeenCalledWith(401);
	});

	it("should respond 401 when invalid API key for GET", async () => {
		const req = {
			method: "GET",
			headers: { "x-ztnet-auth": "invalidApiKey" },
		} as unknown as NextApiRequest;
		const res = {
			status: jest.fn().mockReturnThis(),
			end: jest.fn(),
			json: jest.fn().mockReturnThis(),
			setHeader: jest.fn(), // Mock `setHeader` rate limiter uses it
		} as unknown as NextApiResponse;

		await apiNetworkHandler(req, res);

		expect(res.status).toHaveBeenCalledWith(401);
	});
});
