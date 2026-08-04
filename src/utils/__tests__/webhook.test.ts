/**
 * Regression tests for webhook delivery (GHSA-xm2v-wh78-wjqr follow up).
 *
 * The delivery path must never issue a request to an internal address. The test
 * stands up a real loopback service and asserts it is never contacted, and that
 * the delivery is refused before a socket is opened.
 */
import http from "node:http";
import { AddressInfo } from "node:net";
import { prisma } from "~/server/db";
import { sendWebhook } from "~/utils/webhook";

jest.mock("~/server/db", () => ({
	prisma: {
		webhook: {
			findMany: jest.fn(),
		},
	},
}));

const mockedFindMany = prisma.webhook.findMany as jest.Mock;

// stands in for a localhost bound internal service (ZeroTier controller, metadata endpoint)
let internalService: http.Server;
let internalHits: string[] = [];
let internalPort: number;

beforeAll(async () => {
	internalService = http.createServer((req, res) => {
		internalHits.push(`${req.method} ${req.url}`);
		res.writeHead(200);
		res.end("internal");
	});
	await new Promise<void>((resolve) => internalService.listen(0, "127.0.0.1", resolve));
	internalPort = (internalService.address() as AddressInfo).port;
});

afterAll(async () => {
	await new Promise<void>((resolve) => internalService.close(() => resolve()));
});

beforeEach(() => {
	internalHits = [];
	jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	jest.restoreAllMocks();
});

const givenWebhook = (url: string) => {
	mockedFindMany.mockResolvedValue([
		{ id: "hook1", url, eventTypes: ["NETWORK_CREATED"], organizationId: "org1" },
	]);
};

// delivery is fire and forget, give the detached promise a chance to settle
const flush = () => new Promise((resolve) => setTimeout(resolve, 250));

describe("sendWebhook", () => {
	it("does not deliver to a loopback address", async () => {
		givenWebhook(`https://127.0.0.1:${internalPort}/`);

		await sendWebhook({
			hookType: "NETWORK_CREATED",
			organizationId: "org1",
		} as never);
		await flush();

		expect(internalHits).toEqual([]);
		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining("private or reserved address"),
		);
	});

	it("does not deliver to the cloud metadata endpoint", async () => {
		givenWebhook("https://169.254.169.254/latest/meta-data/");

		await sendWebhook({
			hookType: "NETWORK_CREATED",
			organizationId: "org1",
		} as never);
		await flush();

		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining("private or reserved address"),
		);
	});

	it("does not deliver over plain http", async () => {
		givenWebhook(`http://127.0.0.1:${internalPort}/`);

		await sendWebhook({
			hookType: "NETWORK_CREATED",
			organizationId: "org1",
		} as never);
		await flush();

		expect(internalHits).toEqual([]);
		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining("needs to be HTTPS"),
		);
	});

	it("ignores webhooks that do not subscribe to the event", async () => {
		givenWebhook(`https://127.0.0.1:${internalPort}/`);

		await sendWebhook({
			hookType: "MEMBER_JOINED",
			organizationId: "org1",
		} as never);
		await flush();

		expect(internalHits).toEqual([]);
		expect(console.error).not.toHaveBeenCalled();
	});
});
