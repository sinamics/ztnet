import { Invitation, Organization, OrganizationInvitation } from "@prisma/client";

interface ExtedendOrganizationInvitation extends OrganizationInvitation {
	organization: Organization;
}

export type InvitationLinkType = Invitation & {
	groupName: string | null;
	organizations: ExtedendOrganizationInvitation[];
};
