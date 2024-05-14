import { UserInvitation } from "@prisma/client";

export type InvitationLinkType = UserInvitation & { groupName: string | null };
