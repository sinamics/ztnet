import { NextApiRequest, NextApiResponse } from "next";
import handler from "~/pages/api/mkworld/config";
import { auth } from "~/lib/auth";

jest.mock("~/lib/auth", () => ({
	auth: { api: { getSession: jest.fn() } },
}));

jest.mock("~/server/db", () => ({
	prisma: {},
}));

jest.mock("~/utils/ztApi", () => ({
	ZT_FOLDER: "/nonexistent-zt-folder",
}));

jest.mock("~/utils/planet", () => ({
	updateLocalConf: jest.fn(),
}));

const createRes = () => {
	const res = {
		status: jest.fn().mockReturnThis(),
		json: jest.fn().mockReturnThis(),
		send: jest.fn().mockReturnThis(),
		setHeader: jest.fn(),
	};
	return res as unknown as NextApiResponse & typeof res;
};

const createReq = (method: string) =>
	({ method, headers: {} }) as unknown as NextApiRequest;

describe("/api/mkworld/config authorization", () => {
	const getSession = auth.api.getSession as unknown as jest.Mock;

	it.each(["GET", "POST"])("rejects %s without a session", async (method) => {
		getSession.mockResolvedValue(null);
		const res = createRes();

		await handler(createReq(method), res);

		expect(res.status).toHaveBeenCalledWith(401);
	});

	it.each(["GET", "POST"])("rejects %s from a non admin user", async (method) => {
		getSession.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
		const res = createRes();

		await handler(createReq(method), res);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.setHeader).not.toHaveBeenCalled();
	});

	it("lets an admin through to the handler", async () => {
		getSession.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
		const res = createRes();

		await handler(createReq("GET"), res);

		// The mocked ZT folder does not exist, so the handler itself answers 404.
		expect(res.status).toHaveBeenCalledWith(404);
	});
});
