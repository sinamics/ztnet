import { Invitation } from "@prisma/client";

// Full type for use in router return annotations
export type InvitationLinkType = Invitation & { groupName: string | null };

// Partial type for client-side use (tRPC v11 returns optional properties)
export type InvitationLinkTypePartial = Partial<Invitation> & {
	groupName?: string | null;
};
