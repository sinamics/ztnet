enum Role {
	READ_ONLY = 0,
	USER = 1,
	MODERATOR = 2,
	ADMIN = 3,
}

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
		return false;
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
