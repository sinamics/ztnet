import { upsertCredentialAccount } from "~/server/api/services/credentialAccountService";
import { prisma } from "~/server/db";

jest.mock("~/server/db", () => ({
	prisma: {
		account: {
			upsert: jest.fn(),
		},
	},
}));

describe("upsertCredentialAccount", () => {
	beforeEach(() => {
		(prisma.account.upsert as jest.Mock).mockReset();
	});

	it("upserts the credential Account row keyed by (providerId, accountId)", async () => {
		// better-auth reads passwords from `Account` where `providerId='credential'`
		// and `accountId=<userId>`. The upsert MUST use that compound unique key,
		// otherwise we'd create duplicate rows on every password change.
		(prisma.account.upsert as jest.Mock).mockResolvedValue({});

		await upsertCredentialAccount("user_123", "$2a$10$bcrypthash");

		expect(prisma.account.upsert).toHaveBeenCalledTimes(1);
		expect(prisma.account.upsert).toHaveBeenCalledWith({
			where: {
				providerId_accountId: {
					providerId: "credential",
					accountId: "user_123",
				},
			},
			create: {
				userId: "user_123",
				accountId: "user_123",
				providerId: "credential",
				password: "$2a$10$bcrypthash",
			},
			update: {
				password: "$2a$10$bcrypthash",
			},
		});
	});

	it("propagates DB errors instead of swallowing them", async () => {
		(prisma.account.upsert as jest.Mock).mockRejectedValue(new Error("db down"));
		await expect(upsertCredentialAccount("user_123", "hash")).rejects.toThrow("db down");
	});
});
