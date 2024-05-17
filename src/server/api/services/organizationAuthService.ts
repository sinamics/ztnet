// utility.ts or a relevant utility file
import { TRPCError } from "@trpc/server";
import { Invitation, PrismaClient } from "@prisma/client";
import {
	ORG_INVITE_TOKEN_SECRET,
	decrypt,
	generateInstanceSecret,
} from "~/utils/encryption";

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

		if (inputEmail !== decryptedOrganizationToken.email) {
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
