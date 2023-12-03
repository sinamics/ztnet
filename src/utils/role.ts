import { TRPCClientError } from "@trpc/client";

enum Role {
	READ_ONLY = 0,
	USER = 1,
	MODERATOR = 2,
	ADMIN = 3,
}

/**
 * Checks if a user's role within a specific organization meets or exceeds a required role level.
 *
 * @param {Object} params - The parameters for the function.
 * @param {Object} params.ctx - The context object containing the user session and other relevant data.
 * @param {String} params.organizationId - The ID of the organization for which the role check is being performed.
 * @param {String} params.requiredRole - The required role level that the user's role is being compared against.
 *
 * @returns {Boolean} - Returns `true` if the user's role is equal to or higher than the required role.
 *                               Throws an error if the user's role is lower than the required level or if the user does not have a role in the specified organization.
 *
 * The function first retrieves the user's role within the given organization from the database.
 * It directly allows access for users with the 'ADMIN' role. For other roles, it compares the numerical value
 * of the user's role with the required role's numerical value, based on a predefined 'Role' enum.
 */
export const checkUserOrganizationRole = async ({
	ctx,
	organizationId,
	requiredRole,
}) => {
	const userId = ctx.session.user.id;

	// get the role of the user in the organization
	const orgUserRole = await ctx.prisma.userOrganizationRole.findFirst({
		where: {
			organizationId: organizationId,
			userId,
		},
		select: {
			role: true, // Only select the role
		},
	});

	// If user role is not found, deny access
	if (!orgUserRole) {
		throw new TRPCClientError("You don't have permission to perform this action");
	}
	// Directly return true for admin role
	if (orgUserRole.role === "ADMIN") {
		return true;
	}

	const userRoleValue = Role[orgUserRole.role];
	const requiredRoleValue = Role[requiredRole];

	// Return true if the user's role value meets or exceeds the required role value, otherwise throw an error
	if (userRoleValue >= requiredRoleValue) {
		return true;
	}
	throw new Error("You don't have permission to perform this action");
};
