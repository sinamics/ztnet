// utility.ts or a relevant utility file
import { TRPCError } from "@trpc/server";
import { Invitation, PrismaClient } from "@prisma/client";
import {
	ORG_INVITE_TOKEN_SECRET,
	decrypt,
	generateInstanceSecret,
} from "~/utils/encryption";
import { normalizeEmail } from "~/utils/email";

const prisma = new PrismaClient();

interface OrganizationInvitationData {
	organizationId: string;
	role: string;
	email: string;
	invitation: Partial<Invitation>;
}

export async function validateOrganizationToken(
	organizationToken: string,
	inputEmail: string,
): Promise<Partial<OrganizationInvitationData>> {
	if (!organizationToken?.trim()) {
		return null;
	}
	try {
		const decryptedTokenString = decrypt<string>(
			organizationToken?.trim(),
			generateInstanceSecret(ORG_INVITE_TOKEN_SECRET),
		);

		const decryptedOrganizationToken: Invitation = JSON.parse(decryptedTokenString);

		// The payload is JSON parsed from the token and `Invitation.email` is
		// nullable in the schema, so the type annotation above guarantees nothing
		// at runtime. Reject before normalizing rather than throwing a TypeError.
		if (typeof decryptedOrganizationToken?.email !== "string") {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Invalid token data!",
			});
		}

		// Verify token is not expired by checking the expiry against the current time
		if (new Date(decryptedOrganizationToken.expiresAt) < new Date()) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Token expired!",
			});
		}

		const orgInvitationData = await prisma.organizationInvitation.findFirst({
			where: {
				invitation: {
					role: decryptedOrganizationToken.role,
					token: organizationToken.trim(),
					email: decryptedOrganizationToken.email,
				},
			},
			include: {
				invitation: true,
			},
		});
		if (!orgInvitationData) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Invalid token data!",
			});
		}

		// Compare normalized, the invite may predate email normalization while the
		// registration input is now always lowercased.
		if (normalizeEmail(inputEmail) !== normalizeEmail(decryptedOrganizationToken.email)) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Invalid token data!",
			});
		}

		return orgInvitationData;
	} catch (_e) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Invalid token data!",
		});
	}
}
