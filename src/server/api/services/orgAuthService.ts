import { Role } from "@prisma/client";
import { prisma } from "~/server/db";

export const hasOrganizationWritePermission = async ({
	orgId,
	userId,
}: {
	orgId: string;
	userId: string;
}) => {
	// Define accepted roles as a specific type of array, ensuring it matches your Role type
	const acceptedRoles: Role[] = ["ADMIN", "USER", "MODERATOR"];

	const hasCorrectRole = await prisma.userOrganizationRole.findFirst({
		where: {
			userId: userId,
			organizationId: orgId,
			role: {
				in: acceptedRoles,
			},
		},
	});
	return !!hasCorrectRole;
};
