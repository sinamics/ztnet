import { type Prisma, type PrismaClient } from "@prisma/client";
import { CustomLimitError, throwError } from "~/server/helpers/errorHandler";

/**
 * Organization quotas, set by the instance admin (admin.updateOrganizationQuotas).
 *
 * - `maxNetworks`: how many networks the organization may hold.
 * - `maxMembersPerNetwork`: how many authorized, non deleted members each
 *   organization network may have.
 *
 * NULL means unlimited. The quotas only block new additions. Lowering a quota
 * below the current usage never removes, deauthorizes or deletes anything.
 *
 * ZeroTier itself has no member limit: any node that joins gets a member record
 * on the controller, and a public network authorizes nodes on its own. So the
 * member cap can only be enforced where ZTNET authorizes a member, which is why
 * a capped organization cannot have its networks switched to public.
 */

type QuotaClient = PrismaClient | Prisma.TransactionClient;

export const ORG_QUOTA_MESSAGES = {
	networkLimit: (limit: number) =>
		`This organization has reached its limit of ${limit} networks. Contact the instance administrator to raise the limit.`,
	memberLimit: (limit: number) =>
		`This network has reached the organization limit of ${limit} authorized members. Contact the instance administrator to raise the limit.`,
	publicNotAllowed:
		"This organization has a limit on authorized members per network, so its networks cannot be made public. Contact the instance administrator.",
	transferPublic:
		"This organization has a limit on authorized members per network, so a public network cannot be transferred to it. Make the network private first.",
	transferMemberLimit: (limit: number) =>
		`This network has more authorized members than the organization limit of ${limit}. Deauthorize members first, or contact the instance administrator to raise the limit.`,
};

/** Members that count against the cap: authorized and not stashed or deleted. */
const countedMembersWhere = (nwid: string) => ({
	nwid,
	authorized: true,
	deleted: false,
	permanentlyDeleted: false,
});

export const countAuthorizedMembers = (prisma: QuotaClient, nwid: string) =>
	prisma.network_members.count({ where: countedMembersWhere(nwid) });

/**
 * Throws a CustomLimitError when the organization already holds as many
 * networks as its quota allows. Call it before anything puts a network into
 * the organization.
 */
export const assertOrgNetworkQuota = async (
	prisma: QuotaClient,
	organizationId: string,
) => {
	const organization = await prisma.organization.findUnique({
		where: { id: organizationId },
		select: { maxNetworks: true },
	});
	const limit = organization?.maxNetworks;
	if (limit === null || limit === undefined) return;

	const networkCount = await prisma.network.count({ where: { organizationId } });
	if (networkCount >= limit) {
		throw new CustomLimitError(ORG_QUOTA_MESSAGES.networkLimit(limit));
	}
};

/**
 * Runs `addNetwork` inside a transaction that holds a row lock on the
 * organization and re-checks the network quota first. Requests that add a
 * network to the same organization are serialized on that lock, so two
 * concurrent requests cannot both pass the count and overshoot the quota.
 */
export const withOrgNetworkQuota = async <T>(
	prisma: PrismaClient,
	organizationId: string,
	addNetwork: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> =>
	prisma.$transaction(async (tx) => {
		await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE`;
		await assertOrgNetworkQuota(tx, organizationId);
		return addNetwork(tx);
	});

/**
 * Returns the member cap that applies to a network, or null when the network
 * is personal or its organization has no cap. The organization is always read
 * from the network row, never from client input.
 */
export const getOrgMemberCap = async (
	prisma: QuotaClient,
	nwid: string,
): Promise<number | null> => {
	const network = await prisma.network.findUnique({
		where: { nwid },
		select: {
			organizationId: true,
			organization: { select: { maxMembersPerNetwork: true } },
		},
	});
	if (!network?.organizationId) return null;
	return network.organization?.maxMembersPerNetwork ?? null;
};

/**
 * Throws a CustomLimitError when authorizing `memberId` would take an
 * organization network past its member cap. A member that already counts
 * against the cap passes, so saving an authorized member again is never blocked.
 */
export const assertOrgMemberCap = async (
	prisma: QuotaClient,
	nwid: string,
	memberId: string,
) => {
	const limit = await getOrgMemberCap(prisma, nwid);
	if (limit === null) return;

	const member = await prisma.network_members.findUnique({
		where: { id_nwid: { id: memberId, nwid } },
		select: { authorized: true, deleted: true, permanentlyDeleted: true },
	});
	if (member?.authorized && !member.deleted && !member.permanentlyDeleted) return;

	const authorizedCount = await countAuthorizedMembers(prisma, nwid);
	if (authorizedCount >= limit) {
		throw new CustomLimitError(ORG_QUOTA_MESSAGES.memberLimit(limit));
	}
};

/**
 * Throws a CustomLimitError when an organization network under a member cap is
 * about to be made public. A public network authorizes every node that joins,
 * which would make the cap meaningless.
 */
export const assertOrgNetworkCanBePublic = async (prisma: QuotaClient, nwid: string) => {
	const limit = await getOrgMemberCap(prisma, nwid);
	if (limit !== null) {
		throw new CustomLimitError(ORG_QUOTA_MESSAGES.publicNotAllowed);
	}
};

/**
 * Checks a personal network against the member cap of the organization it is
 * being transferred into: it must be private and within the cap, otherwise the
 * transfer would bring in what the organization could not have built itself.
 */
export const assertNetworkFitsOrgMemberCap = async (
	prisma: QuotaClient,
	organizationId: string,
	nwid: string,
	isPrivate: () => Promise<boolean>,
) => {
	const organization = await prisma.organization.findUnique({
		where: { id: organizationId },
		select: { maxMembersPerNetwork: true },
	});
	const limit = organization?.maxMembersPerNetwork;
	if (limit === null || limit === undefined) return;

	if (!(await isPrivate())) {
		throw new CustomLimitError(ORG_QUOTA_MESSAGES.transferPublic);
	}
	const authorizedCount = await countAuthorizedMembers(prisma, nwid);
	if (authorizedCount > limit) {
		throw new CustomLimitError(ORG_QUOTA_MESSAGES.transferMemberLimit(limit));
	}
};

/**
 * Runs a quota check and turns a CustomLimitError into the FORBIDDEN tRPC
 * error the client shows as a toast (and the REST API returns as a 403).
 */
export const enforceQuota = async <T>(check: () => Promise<T>): Promise<T> => {
	try {
		return await check();
	} catch (error) {
		if (error instanceof CustomLimitError) {
			return throwError(error.message, "FORBIDDEN");
		}
		throw error;
	}
};
