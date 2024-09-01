import apiStatsHandler from "~/pages/api/v1/stats/index";
import { NextApiRequest, NextApiResponse } from "next";

describe("/api/stats", () => {
	it("should allow only GET method", async () => {
		const methods = ["DELETE", "POST", "PUT", "PATCH", "OPTIONS", "HEAD"];
		const req = {
			method: "GET",
			headers: {
				"x-ztnet-auth": "validApiKey",
			},
			query: {},
			body: {},
		} as unknown as NextApiRequest;

		const res = {
			status: jest.fn().mockReturnThis(),
			end: jest.fn(),
			json: jest.fn().mockReturnThis(),
			setHeader: jest.fn(),
		} as unknown as NextApiResponse;

		for (const method of methods) {
			req.method = method;
			await apiStatsHandler(req, res);

			expect(res.status).toHaveBeenCalledWith(405);

			// expect json to be called with text "Method Not Allowed"
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({ error: "Method Not Allowed" }),
			);
		}
	});

	it("should respond 401 when invalid API key for GET", async () => {
		const req = {
			method: "GET",
			headers: { "x-ztnet-auth": "invalidApiKey" },
			query: {},
			body: {},
		} as unknown as NextApiRequest;

		const res = {
			status: jest.fn().mockReturnThis(),
			end: jest.fn(),
			json: jest.fn().mockReturnThis(),
			setHeader: jest.fn(), // Mock `setHeader` rate limiter uses it
		} as unknown as NextApiResponse;

		await apiStatsHandler(req, res);

		expect(res.status).toHaveBeenCalledWith(401);
	});
});
