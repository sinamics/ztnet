import planetHandler from "~/pages/api/planet";
import { prisma } from "~/server/db";
import { decryptAndVerifyToken } from "~/utils/encryption";

jest.mock("~/server/db", () => ({
	prisma: {
		globalOptions: {
			findFirst: jest.fn(),
		},
	},
}));

jest.mock("~/utils/encryption", () => ({
	decryptAndVerifyToken: jest.fn(),
}));

jest.mock("fs", () => ({
	__esModule: true,
	default: {
		existsSync: jest.fn(() => true),
		statSync: jest.fn(() => ({ isDirectory: () => true })),
		createReadStream: jest.fn(() => ({ pipe: jest.fn() })),
		readFileSync: jest.fn(() => "secret"),
	},
	existsSync: jest.fn(() => true),
	statSync: jest.fn(() => ({ isDirectory: () => true })),
	createReadStream: jest.fn(() => ({ pipe: jest.fn() })),
	readFileSync: jest.fn(() => "secret"),
}));

const mockedPrisma = prisma as unknown as {
	globalOptions: { findFirst: jest.Mock };
};
const mockedDecryptAndVerifyToken = decryptAndVerifyToken as jest.MockedFunction<
	typeof decryptAndVerifyToken
>;

const response = () => {
	const res = {
		status: jest.fn().mockReturnThis(),
		send: jest.fn().mockReturnThis(),
		setHeader: jest.fn(),
	};
	return res;
};

describe("/api/planet", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("allows anonymous downloads in public mode", async () => {
		mockedPrisma.globalOptions.findFirst.mockResolvedValue({
			planetDownloadAuthMode: "PUBLIC",
		});
		const res = response();

		await planetHandler({ method: "GET", headers: {} } as never, res as never);

		expect(mockedDecryptAndVerifyToken).not.toHaveBeenCalled();
		expect(res.setHeader).toHaveBeenCalledWith(
			"Content-Disposition",
			"attachment; filename=planet.custom",
		);
	});

	it("rejects protected planet downloads without a REST API token", async () => {
		mockedPrisma.globalOptions.findFirst.mockResolvedValue({
			planetDownloadAuthMode: "REST_API",
		});
		const res = response();

		await planetHandler({ method: "GET", headers: {} } as never, res as never);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.send).toHaveBeenCalledWith("API token is required.");
	});

	it("accepts protected planet downloads with an admin personal REST API token", async () => {
		mockedPrisma.globalOptions.findFirst.mockResolvedValue({
			planetDownloadAuthMode: "REST_API",
		});
		mockedDecryptAndVerifyToken.mockResolvedValue({
			userId: "user_1",
			name: "Admin",
			tokenId: "token_1",
			apiAuthorizationType: ["PERSONAL"],
		} as never);
		const res = response();

		await planetHandler(
			{ method: "GET", headers: { "x-ztnet-auth": "token" } } as never,
			res as never,
		);

		expect(mockedDecryptAndVerifyToken).toHaveBeenCalledWith({
			apiKey: "token",
			apiAuthorizationType: "PERSONAL",
			requireAdmin: true,
		});
		expect(res.setHeader).toHaveBeenCalledWith(
			"Content-Disposition",
			"attachment; filename=planet.custom",
		);
	});
});
