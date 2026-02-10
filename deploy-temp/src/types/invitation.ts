import { Invitation } from "@prisma/client";

export type InvitationLinkType = Invitation & { groupName: string | null };
