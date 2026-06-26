import { useTranslations } from "next-intl";
import { isIPInSubnet } from "~/utils/isIpInsubnet";
import { toRfc4193Ip, sixPlane } from "~/utils/IPv6";
import type { MemberEntity } from "~/types/local/member";
import type { NetworkEntity, RoutesEntity } from "~/types/local/network";
import { CopyableIp, GeneratedIpBadge } from "../components/IpBadge";

interface Props {
	original: MemberEntity;
	nwid: string;
	network: NetworkEntity | undefined;
	onDeleteIp: (ipAssignments: string[], ip: string, memberId: string) => void;
}

/**
 * Managed IP / latency cell. Renders the auto-generated RFC4193 / 6PLANE
 * addresses (read-only), then each assigned IP as a copyable badge — styled by
 * subnet match — with latency, a delete control, and AA/EB flag badges. All IP
 * values truncate within the cell so long IPv6 addresses never overflow.
 */
export const IpAssignmentsCell = ({ original, nwid, network, onDeleteIp }: Props) => {
	const t = useTranslations();
	const { noAutoAssignIps, activeBridge } = original || {};
	const hasRfc4193 = network?.v6AssignMode?.rfc4193;
	const has6plane = network?.v6AssignMode?.["6plane"];

	if (!original.ipAssignments?.length && !hasRfc4193 && !has6plane) {
		return (
			<p className="text-gray-500 text-sm">
				{t("commonTable.header.ipAssignments.notAssigned")}
			</p>
		);
	}

	const rfc4193Ip = hasRfc4193 ? toRfc4193Ip(nwid, original?.id) : undefined;
	const sixPlaneIp = has6plane ? sixPlane(nwid, original?.id) : undefined;

	return (
		<div className="space-y-1">
			<div className="text-left">
				{hasRfc4193 && rfc4193Ip ? <GeneratedIpBadge ip={rfc4193Ip} /> : null}
				{has6plane && sixPlaneIp ? <GeneratedIpBadge ip={sixPlaneIp} /> : null}
			</div>

			{original?.ipAssignments?.map((assignedIp) => {
				const subnetMatch = isIPInSubnet(assignedIp, network?.routes as RoutesEntity[]);
				return (
					<div key={assignedIp} className="flex">
						<div
							className={`${
								subnetMatch
									? "badge badge-primary badge-lg rounded-md"
									: "badge badge-ghost badge-lg rounded-md opacity-60"
							} flex min-w-0 max-w-full justify-between gap-1`}
						>
							<CopyableIp ip={assignedIp} className="text-sm" />
							<div className="text-xs whitespace-nowrap">
								{original?.peers?.latency > 0 && ` (${original?.peers.latency}ms)`}
							</div>
							{original?.ipAssignments.length > 0 && (
								<div title="delete ip assignment">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth="1.5"
										stroke="currentColor"
										className="z-10 ml-4 h-4 w-4 cursor-pointer text-warning"
										onClick={() =>
											onDeleteIp(original?.ipAssignments, assignedIp, original?.id)
										}
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
										/>
									</svg>
								</div>
							)}
						</div>
						<div className="flex gap-1 pl-1">
							{noAutoAssignIps ? (
								<kbd title="Do Not Auto-Assign IPs" className="kbd kbd-xs">
									AA
								</kbd>
							) : (
								""
							)}
							{activeBridge ? (
								<kbd title="Allow Ethernet Bridging" className="kbd kbd-xs">
									EB
								</kbd>
							) : (
								""
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
};
