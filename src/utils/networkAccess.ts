import { throwError } from "~/server/helpers/errorHandler";
import { checkUserOrganizationRole } from "~/utils/role";
import { type Role } from "@prisma/client";

/**
 * Checks if the current user has access to a network by verifying:
 *
 * For personal networks (no organizationId on the network in DB):
 *   - The user must be the author (owner) of the network
 *
 * For organization networks (organizationId exists on the network in DB):
 *   - The user must be a member of that organization with at least `minimumRequiredRole`
 *
 * The organizationId is always looked up from the database, NOT from client input,
 * which prevents attackers from bypassing the check by omitting organizationId.
 */
export const checkNetworkAccess = async (
	ctx: {
		session: { user: { id: string } };
		prisma: {
			network: {
				findUnique: (args: {
					where: { nwid: string };
					select: { authorId: boolean; organizationId: boolean };
				}) => Promise<{ authorId: string; organizationId: string | null } | null>;
			};
			userOrganizationRole: {
				findFirst: (args: unknown) => Promise<unknown>;
			};
		};
	},
	nwid: string,
	minimumRequiredRole: Role,
) => {
	const network = await ctx.prisma.network.findUnique({
		where: { nwid },
		select: { authorId: true, organizationId: true },
	});

	if (!network) {
		return throwError("Network not found!", "NOT_FOUND");
	}

	// Organization network: check user has the required role in the organization
	if (network.organizationId) {
		await checkUserOrganizationRole({
			ctx,
			organizationId: network.organizationId,
			minimumRequiredRole,
		});
		return;
	}

	// Personal network: only the author (owner) can access
	if (network.authorId !== ctx.session.user.id) {
		return throwError("You do not have access to this network!");
	}
};
