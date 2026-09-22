/**
 * Delivery behaviour of the WEBHOOK_ALLOW_PRIVATE_TARGETS opt out.
 *
 * DNS and the https client are mocked so the test can observe exactly which
 * address the delivery pins to, without opening sockets. The companion
 * webhook.test.ts drives a real loopback server for the reserved ranges.
 */
import { EventEmitter } from "node:events";
import { prisma } from "~/server/db";
import { ALLOW_PRIVATE_TARGETS_ENV } from "~/utils/ssrfGuard";
import { sendWebhook } from "~/utils/webhook";

jest.mock("~/server/db", () => ({
	prisma: {
		webhook: {
			findMany: jest.fn(),
		},
	},
}));

jest.mock("node:dns/promises", () => ({
	lookup: jest.fn(),
}));

jest.mock("node:https", () => ({
	request: jest.fn(),
}));

import { lookup } from "node:dns/promises";
import { request } from "node:https";

const mockedFindMany = prisma.webhook.findMany as jest.Mock;
const mockedLookup = lookup as jest.MockedFunction<typeof lookup>;
const mockedRequest = request as jest.Mock;

// Minimal stand in for http.ClientRequest that answers 200 as soon as the
// body is written, and records what it was asked to connect to.
const answerWith = (status: number) => {
	mockedRequest.mockImplementation((options, onResponse) => {
		const req = new EventEmitter() as EventEmitter & {
			end: (body: string) => void;
			destroy: jest.Mock;
			written: string;
			options: unknown;
		};
		req.options = options;
		req.destroy = jest.fn();
		req.end = (body: string) => {
			req.written = body;
			const res = new EventEmitter() as EventEmitter & {
				statusCode: number;
				statusMessage: string;
				resume: jest.Mock;
			};
			res.statusCode = status;
			res.statusMessage = status === 200 ? "OK" : "Error";
			res.resume = jest.fn();
			onResponse(res);
		};
		return req;
	});
};

const givenWebhook = (url: string) => {
	mockedFindMany.mockResolvedValue([
		{ id: "hook1", url, eventTypes: ["NETWORK_CREATED"], organizationId: "org1" },
	]);
};

const fire = async () => {
	await sendWebhook({
		hookType: "NETWORK_CREATED",
		organizationId: "org1",
		networkId: "nw1",
	} as never);
	// delivery is fire and forget, give the detached promise a chance to settle
	await new Promise((resolve) => setTimeout(resolve, 50));
};

const withPrivateTargets = (value: string | undefined) => {
	if (value === undefined) {
		delete process.env[ALLOW_PRIVATE_TARGETS_ENV];
	} else {
		process.env[ALLOW_PRIVATE_TARGETS_ENV] = value;
	}
};

beforeEach(() => {
	withPrivateTargets(undefined);
	mockedLookup.mockReset();
	mockedRequest.mockReset();
	answerWith(200);
	jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	jest.restoreAllMocks();
});

afterAll(() => {
	withPrivateTargets(undefined);
});

describe("sendWebhook to private network targets", () => {
	describe("by default", () => {
		it("refuses a LAN hostname and names the opt out", async () => {
			mockedLookup.mockResolvedValue([{ address: "192.168.1.20", family: 4 }] as never);
			givenWebhook("https://n8n.home.example.com/hook");

			await fire();

			expect(mockedRequest).not.toHaveBeenCalled();
			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining(`Set ${ALLOW_PRIVATE_TARGETS_ENV}=true`),
			);
		});

		it("refuses a docker service hostname", async () => {
			mockedLookup.mockResolvedValue([{ address: "172.18.0.3", family: 4 }] as never);
			givenWebhook("https://n8n:5678/hook");

			await fire();

			expect(mockedRequest).not.toHaveBeenCalled();
		});

		it("refuses a private ip literal", async () => {
			givenWebhook("https://10.0.0.5:8443/hook");

			await fire();

			expect(mockedLookup).not.toHaveBeenCalled();
			expect(mockedRequest).not.toHaveBeenCalled();
		});

		it("delivers to a public hostname", async () => {
			mockedLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);
			givenWebhook("https://hooks.example.com/abc");

			await fire();

			expect(mockedRequest).toHaveBeenCalledTimes(1);
			expect(mockedRequest.mock.calls[0][0]).toMatchObject({
				host: "93.184.216.34",
				family: 4,
				servername: "hooks.example.com",
			});
			expect(console.error).not.toHaveBeenCalled();
		});
	});

	describe(`with ${ALLOW_PRIVATE_TARGETS_ENV}=true`, () => {
		beforeEach(() => withPrivateTargets("true"));

		it("delivers to a LAN hostname, pinned to the private address", async () => {
			mockedLookup.mockResolvedValue([{ address: "192.168.1.20", family: 4 }] as never);
			givenWebhook("https://n8n.home.example.com/hook?x=1");

			await fire();

			expect(mockedRequest).toHaveBeenCalledTimes(1);
			const options = mockedRequest.mock.calls[0][0];
			expect(options).toMatchObject({
				host: "192.168.1.20",
				family: 4,
				port: 443,
				path: "/hook?x=1",
				method: "POST",
				// the certificate is still validated against the configured name
				servername: "n8n.home.example.com",
			});
			expect(options.headers.Host).toBe("n8n.home.example.com");
			expect(console.error).not.toHaveBeenCalled();
		});

		it("delivers to a docker service with its port", async () => {
			mockedLookup.mockResolvedValue([{ address: "172.18.0.3", family: 4 }] as never);
			givenWebhook("https://n8n:5678/hook");

			await fire();

			expect(mockedRequest).toHaveBeenCalledTimes(1);
			expect(mockedRequest.mock.calls[0][0]).toMatchObject({
				host: "172.18.0.3",
				port: "5678",
				servername: "n8n",
			});
		});

		it("delivers to a private ip literal without a DNS lookup", async () => {
			givenWebhook("https://10.0.0.5:8443/hook");

			await fire();

			expect(mockedLookup).not.toHaveBeenCalled();
			expect(mockedRequest).toHaveBeenCalledTimes(1);
			expect(mockedRequest.mock.calls[0][0]).toMatchObject({
				host: "10.0.0.5",
				port: "8443",
				servername: undefined,
			});
		});

		it("delivers to a unique local IPv6 address", async () => {
			mockedLookup.mockResolvedValue([{ address: "fd00::20", family: 6 }] as never);
			givenWebhook("https://hooks.internal.example.com/");

			await fire();

			expect(mockedRequest).toHaveBeenCalledTimes(1);
			expect(mockedRequest.mock.calls[0][0]).toMatchObject({
				host: "fd00::20",
				family: 6,
			});
		});

		it("sends the event payload", async () => {
			mockedLookup.mockResolvedValue([{ address: "192.168.1.20", family: 4 }] as never);
			givenWebhook("https://n8n.home.example.com/hook");

			await fire();

			const req = mockedRequest.mock.results[0].value;
			expect(JSON.parse(req.written)).toEqual({
				hookType: "NETWORK_CREATED",
				organizationId: "org1",
				networkId: "nw1",
			});
		});

		it.each([
			["loopback", "127.0.0.1"],
			["mapped loopback", "::ffff:7f00:1"],
			["cloud metadata", "169.254.169.254"],
			["mapped cloud metadata", "::ffff:a9fe:a9fe"],
			["unspecified", "0.0.0.0"],
			["IPv6 loopback", "::1"],
			["link local IPv6", "fe80::1"],
		])("still refuses a hostname that resolves only to %s", async (_label, address) => {
			mockedLookup.mockResolvedValue([
				{ address, family: address.includes(":") ? 6 : 4 },
			] as never);
			givenWebhook("https://evil.example.com/hook");

			await fire();

			expect(mockedRequest).not.toHaveBeenCalled();
			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("private or reserved address"),
			);
		});

		it.each([
			"https://127.0.0.1:9993/",
			"https://[::ffff:127.0.0.1]:9993/",
			"https://[::ffff:7f00:1]:9993/",
			"https://169.254.169.254/latest/meta-data/",
			"https://[::ffff:a9fe:a9fe]/latest/meta-data/",
			"https://localhost:9993/",
			"https://[::1]:9993/",
		])("still refuses reserved literal %s", async (url) => {
			givenWebhook(url);

			await fire();

			expect(mockedLookup).not.toHaveBeenCalled();
			expect(mockedRequest).not.toHaveBeenCalled();
		});

		it("still refuses plain http to a private address", async () => {
			givenWebhook("http://192.168.1.20/hook");

			await fire();

			expect(mockedRequest).not.toHaveBeenCalled();
			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("needs to be HTTPS"),
			);
		});

		it("reports a non 2xx answer from the private receiver", async () => {
			answerWith(500);
			mockedLookup.mockResolvedValue([{ address: "192.168.1.20", family: 4 }] as never);
			givenWebhook("https://n8n.home.example.com/hook");

			await fire();

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining("Failed to send webhook: 500"),
			);
		});
	});

	it("reads the opt out at delivery time, not at startup", async () => {
		mockedLookup.mockResolvedValue([{ address: "192.168.1.20", family: 4 }] as never);
		givenWebhook("https://n8n.home.example.com/hook");

		await fire();
		expect(mockedRequest).not.toHaveBeenCalled();

		withPrivateTargets("true");
		await fire();
		expect(mockedRequest).toHaveBeenCalledTimes(1);

		withPrivateTargets("false");
		await fire();
		expect(mockedRequest).toHaveBeenCalledTimes(1);
	});
});
