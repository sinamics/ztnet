import { useTranslations } from "next-intl";
import TimeAgo from "react-timeago";
import type { MemberEntity } from "~/types/local/member";
import { ConnectionStatus } from "../constants";

interface Props {
	original: MemberEntity;
	central: boolean;
}

const cursorStyle = { cursor: "pointer" };

const formatTime = (value: string, unit: string) => {
	const unitAbbreviations: { [key: string]: string } = {
		second: "sec",
		minute: "min",
		hour: "hour",
		day: "day",
		week: "week",
		month: "month",
		year: "year",
	};
	return `${value} ${unitAbbreviations[unit] || unit}`;
};

/**
 * Connection status. Central networks show ONLINE/offline from a 5-minute
 * lastSeen window; local controllers distinguish Controller / Relayed /
 * Direct (LAN/WAN, with peer version) / Offline.
 */
export const ConnectionStatusCell = ({ original, central }: Props) => {
	const c = useTranslations("commonTable");
	const lastSeen = new Date(original?.lastSeen);

	const offline = (
		<span
			style={cursorStyle}
			className="text-error space-x-1 text-sm"
			title="User is offline"
		>
			<span>{c("header.conStatus.offline")}</span>
			<span>
				<TimeAgo date={lastSeen} formatter={formatTime} title={lastSeen} />
			</span>
		</span>
	);

	if (central) {
		const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
		if (lastSeen.getTime() >= fiveMinutesAgo) {
			return (
				<span style={cursorStyle} className="text-success text-sm" title="User is online">
					ONLINE
				</span>
			);
		}
		return offline;
	}

	if (original.conStatus === ConnectionStatus.Controller) {
		return (
			<span
				style={cursorStyle}
				className="cursor-pointer text-warning text-sm"
				title="Controller"
			>
				CONTROLLER
			</span>
		);
	}

	if (original.conStatus === ConnectionStatus.Relayed) {
		return (
			<span
				style={cursorStyle}
				className="cursor-pointer text-warning text-sm"
				title={c("header.conStatus.toolTip")}
			>
				{c("header.conStatus.relayed")}
			</span>
		);
	}

	if (
		original.conStatus === ConnectionStatus.DirectLAN ||
		original.conStatus === ConnectionStatus.DirectWAN
	) {
		const directTitle =
			original.conStatus === ConnectionStatus.DirectLAN
				? c("header.conStatus.directLan")
				: c("header.conStatus.directWan");
		const versionInfo =
			original.peers?.version && original.peers.version !== "-1.-1.-1"
				? ` (v${original.peers.version})`
				: "";

		return (
			<div style={cursorStyle} className="text-success text-sm" title={directTitle}>
				{c("header.conStatus.direct", { version: versionInfo })}{" "}
			</div>
		);
	}

	return offline;
};
