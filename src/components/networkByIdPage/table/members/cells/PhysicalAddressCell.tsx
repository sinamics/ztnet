import { useTranslations } from "next-intl";
import type { MemberEntity } from "~/types/local/member";
import { ConnectionStatus } from "../constants";

interface Props {
	original: MemberEntity;
	central: boolean;
}

/**
 * Physical (peer) IP address. Strips the CIDR/port suffix, dims when offline, and
 * truncates with a `title` tooltip so long IPv6 addresses stay within the column.
 */
export const PhysicalAddressCell = ({ original, central }: Props) => {
	const c = useTranslations("commonTable");
	const physicalAddress = original?.physicalAddress;
	const isOffline = original?.conStatus === ConnectionStatus.Offline;

	if (!physicalAddress || typeof physicalAddress !== "string") {
		return (
			<span className="text-gray-400/50 text-sm">
				{c("header.physicalIp.unknownValue")}
			</span>
		);
	}

	const address = physicalAddress.split("/")[0];
	const dim = !central && isOffline;

	return (
		<span
			className={`block truncate text-sm ${dim ? "text-gray-400/50" : ""}`}
			title={address}
		>
			{address}
		</span>
	);
};
