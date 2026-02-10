import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "~/server/db";
import { encrypt, generateInstanceSecret, API_TOKEN_SECRET } from "~/utils/encryption";

type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

export function createGenericApiTests(
	handler: ApiHandler,
	method = "GET",
	additionalRequiredParams: string[] = [],
) {
	return () => {
		let mockRequest: Partial<NextApiRequest>;
		let mockResponse: Partial<NextApiResponse>;

		beforeEach(() => {
			mockRequest = {
				headers: {},
				body: {},
				query: {},
				method,
			};
			mockResponse = {
				status: jest.fn().mockReturnThis(),
				setHeader: jest.fn(),
				end: jest.fn(),
				json: jest.fn(() => {
					return mockResponse;
				}),
			};
		});

		test('should throw "Invalid Authorization Type" for mismatched authorization types', async () => {
			// Mock decrypt function to return a payload that simulates a mismatched authorization type
			const tokendata = JSON.stringify({
				userId: "testUserId",
				tokenId: "testTokenId",
				apiAuthorizationType: ["PERSONAL"],
			});
			mockRequest.query = {
				orgid: "testOrgId",
				nwid: "testNetworkId",
			};
			const tokenWithIdHash = encrypt(
				tokendata,
				generateInstanceSecret(API_TOKEN_SECRET),
			);
			mockRequest.headers["x-ztnet-auth"] = tokenWithIdHash;

			await handler(mockRequest as NextApiRequest, mockResponse as NextApiResponse);

			const error = new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Invalid Authorization Type",
			});

			const httpCode = getHTTPStatusCodeFromError(error);
			expect(mockResponse.status).toHaveBeenCalledWith(httpCode);
			expect(mockResponse.json).toHaveBeenCalledWith({ message: error.message });
		});

		test("should respond with bad request for missing orgid", async () => {
			mockRequest.query = {};
			const validTokenData = JSON.stringify({
				userId: "testUserId",
				tokenId: "testTokenId",
				apiAuthorizationType: ["ORGANIZATION"],
			});
			// set req.method to GET
			mockRequest.method = "GET";

			const validToken = encrypt(
				validTokenData,
				generateInstanceSecret(API_TOKEN_SECRET),
			);
			mockRequest.headers["x-ztnet-auth"] = validToken;

			await handler(mockRequest as NextApiRequest, mockResponse as NextApiResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(400);
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.stringContaining("Organization ID is required"),
				}),
			);
		});

		test("should respond with bad request for missing additional required parameters", async () => {
			if (additionalRequiredParams.length > 0) {
				mockRequest.query = {
					orgid: "testOrgId",
					nwid: "testNetworkId",
				};
				const validTokenData = JSON.stringify({
					userId: "testUserId",
					tokenId: "testTokenId",
					apiAuthorizationType: ["ORGANIZATION"],
				});
				const validToken = encrypt(
					validTokenData,
					generateInstanceSecret(API_TOKEN_SECRET),
				);
				mockRequest.headers["x-ztnet-auth"] = validToken;

				await handler(mockRequest as NextApiRequest, mockResponse as NextApiResponse);

				expect(mockResponse.status).toHaveBeenCalledWith(400);
				expect(mockResponse.json).toHaveBeenCalledWith(
					expect.objectContaining({
						error: expect.stringContaining("is required"),
					}),
				);
			}
		});

		test("should respond with unauthorized for invalid token", async () => {
			mockRequest.query = { orgid: "testOrgId", nwid: "testNetworkId" };
			mockRequest.headers["x-ztnet-auth"] = "invalid_token";

			// mock prisma transaction
			prisma.$transaction = jest.fn().mockResolvedValue({
				id: "newUserId",
				name: "Ztnet",
				email: "post@ztnet.network",
			});

			await handler(mockRequest as NextApiRequest, mockResponse as NextApiResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(expect.any(Number));
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.stringContaining("Invalid token"),
				}),
			);
		});

		test("should deny access if member is not tied to organization", async () => {
			mockRequest.query = { orgid: "testOrgId", nwid: "testNetworkId" };
			const validTokenData = JSON.stringify({
				userId: "testUserId",
				tokenId: "testTokenId",
				apiAuthorizationType: ["ORGANIZATION"],
			});
			const validToken = encrypt(
				validTokenData,
				generateInstanceSecret(API_TOKEN_SECRET),
			);
			mockRequest.headers["x-ztnet-auth"] = validToken;

			prisma.userOrganizationRole.findFirst = jest.fn().mockResolvedValue(null);

			await handler(mockRequest as NextApiRequest, mockResponse as NextApiResponse);

			expect(mockResponse.status).toHaveBeenCalledWith(expect.any(Number));
			expect(mockResponse.json).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining("You are not a member of this organization"),
				}),
			);
		});
	};
}
