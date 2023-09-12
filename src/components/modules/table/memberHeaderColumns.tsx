import { useMemo } from "react";
import { MemberOptionsModal } from "../memberOptionsModal";
import { api } from "~/utils/api";
import { useModalStore } from "~/utils/store";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import TimeAgo from "react-timeago";
import { type ColumnDef, createColumnHelper, Row } from "@tanstack/react-table";
import { type NetworkMemberNotation, type MemberEntity } from "~/types/local/member";
import { User, UserOptions } from "@prisma/client";

enum ConnectionStatus {
	Offline = 0,
	Relayed = 1,
	DirectLAN = 2,
	DirectWAN = 3,
	Controller = 4,
}

interface IProp {
	nwid: string;
	central: boolean;
}

interface UserExtended extends User {
	options: UserOptions & {
		deAuthorizeWarning: boolean;
	};
}

const sortingMemberHex = (
	rowA: Row<MemberEntity>,
	rowB: Row<MemberEntity>,
	columnId: string,
): number => {
	const a = rowA.original[columnId] as string;
	const b = rowB.original[columnId] as string;

	const numA = a ? BigInt(`0x${a}`) : a;
	const numB = b ? BigInt(`0x${b}`) : b;

	if (numA > numB) return 1;
	if (numA < numB) return -1;
	return 0;
};
const hexToBigInt = (hex: string) => BigInt(`0x${hex}`);
const sortIP = (ip: string) => {
	if (ip.includes(":")) {
		const fullAddress = ip
			.split(":")
			.map((hex) => hex.padStart(4, "0"))
			.join("");
		return hexToBigInt(fullAddress);
	} else {
		return BigInt(
			ip
				.split(".")
				.map(Number)
				.reduce((acc, val) => acc * 256 + val),
		);
	}
};

const sortingIpaddress = (
	rowA: Row<MemberEntity>,
	rowB: Row<MemberEntity>,
	columnId: string,
): number => {
	const a = rowA.original[columnId] as string | string[];
	const b = rowB.original[columnId] as string | string[];

	let numA: BigInt;
	let numB: BigInt;

	if (Array.isArray(a)) {
		numA = a.length ? sortIP(a[0]) : BigInt(0);
	} else {
		numA = a?.length ? sortIP(a) : BigInt(0);
	}

	if (Array.isArray(b)) {
		numB = b.length ? sortIP(b[0]) : BigInt(0);
	} else {
		numB = b?.length ? sortIP(b) : BigInt(0);
	}
	if (numA > numB) return 1;
	if (numA < numB) return -1;
	return 0;
};

export const MemberHeaderColumns = ({ nwid, central = false }: IProp) => {
	const t = useTranslations();
	const { callModal } = useModalStore((state) => state);
	const { data: me } = api.auth.me.useQuery<UserExtended>();
	const { data: networkById, refetch: refetchNetworkById } =
		api.network.getNetworkById.useQuery(
			{
				nwid,
				central,
			},
			{ enabled: !!nwid },
		);

	const { mutate: updateMember } = api.networkMember.Update.useMutation({
		onError: (e) => {
			void toast.error(e?.message);
		},
		onSuccess: () => void refetchNetworkById(),
	});

	const columnHelper = createColumnHelper<MemberEntity>();
	const columns = useMemo<ColumnDef<MemberEntity>[]>(
		() => [
			columnHelper.accessor(
				(row) => {
					// rome-ignore lint/suspicious/noExplicitAny: <explanation>
					const notations = (row as any)?.notations as NetworkMemberNotation[];
					const output: string[] = [];
					notations?.map((tag) => {
						return output.push(tag?.label?.name);
					});

					return output.join(", ");
				},
				{
					header: () => "Notations",
					id: "notations",
				},
			),
			columnHelper.accessor("authorized", {
				header: () => (
					<span>{t("networkById.networkMembersTable.column.authorized")}</span>
				),
				id: "authorized",
				cell: ({ getValue, row: { original } }) => {
					return (
						<label className="label cursor-pointer justify-center">
							<input
								type="checkbox"
								checked={getValue()}
								onChange={(event) => {
									const authorized = event.target.checked;
									if (me?.options?.deAuthorizeWarning && !authorized) {
										callModal({
											title: "Warning",
											description: "Are you sure you want to deauthorize this member?",
											yesAction: () => {
												updateMember(
													{
														nwid,
														memberId: original.id,
														central,
														updateParams: { authorized },
													},
													{ onSuccess: () => void refetchNetworkById() },
												);
											},
										});
									} else {
										updateMember(
											{
												nwid,
												memberId: original.id,
												central,
												updateParams: { authorized: event.target.checked },
											},
											{ onSuccess: () => void refetchNetworkById() },
										);
									}
								}}
								// className="checkbox-error checkbox"
								className="checkbox-success checkbox checkbox-xs sm:checkbox-sm"
							/>
						</label>
					);
				},
			}),
			columnHelper.accessor("name", {
				header: () => <span>{t("networkById.networkMembersTable.column.name")}</span>,
				id: "name",
			}),
			columnHelper.accessor("id", {
				header: () => <span>{t("networkById.networkMembersTable.column.id")}</span>,
				id: "id",
				sortingFn: sortingMemberHex,
				cell: (info) => info.getValue(),
			}),
			columnHelper.accessor("ipAssignments", {
				header: () => (
					<span>{t("networkById.networkMembersTable.column.ipAssignments.header")}</span>
				),
				id: "ipAssignments",
				sortingFn: sortingIpaddress,
			}),
			columnHelper.accessor("creationTime", {
				header: () => <span>{t("networkById.networkMembersTable.column.created")}</span>,
				id: "creationTime",
				cell: (info) => {
					const createdDate = new Date(info.getValue());
					const formatTime = (value: string, unit: string) => {
						// Map full unit names to their abbreviations
						const unitAbbreviations: { [key: string]: string } = {
							second: "sec ago",
							minute: "min ago",
							hour: "hours ago",
							day: "days ago",
							week: "weeks ago",
							month: "months ago",
							year: "years ago",
						};
						const abbreviation = unitAbbreviations[unit] || unit;

						return `${value} ${abbreviation}`;
					};
					return (
						<TimeAgo date={createdDate} formatter={formatTime} title={createdDate} />
					);
				},
			}),
			columnHelper.accessor("peers", {
				header: () => (
					<span>{t("networkById.networkMembersTable.column.physicalIp.header")}</span>
				),
				id: "physicalAddress",
				sortingFn: sortingIpaddress,
				cell: ({ getValue, row: { original } }) => {
					if (central) {
						const val = original;
						if (!val || typeof val.physicalAddress !== "string")
							return (
								<span className="text-gray-400/50">
									{t("networkById.networkMembersTable.column.physicalIp.unknownValue")}
								</span>
							);

						return val.physicalAddress.split("/")[0];
					}
					const val = getValue();
					if (!val || typeof val.physicalAddress !== "string")
						return (
							<span className="text-gray-400/50">
								{t("networkById.networkMembersTable.column.physicalIp.unknownValue")}
							</span>
						);

					return val.physicalAddress.split("/")[0];
				},
			}),
			columnHelper.accessor("conStatus", {
				header: () => (
					<span>{t("networkById.networkMembersTable.column.conStatus.header")}</span>
				),
				id: "conStatus",
				cell: ({ row: { original } }) => {
					const lastSeen = new Date(original?.lastSeen);

					const formatTime = (value: string, unit: string) => {
						// Map full unit names to their abbreviations
						const unitAbbreviations: { [key: string]: string } = {
							second: "sec",
							minute: "min",
							hour: "hour",
							day: "day",
							week: "week",
							month: "month",
							year: "year",
						};
						const abbreviation = unitAbbreviations[unit] || unit;
						return `${value} ${abbreviation}`;
					};
					const cursorStyle = { cursor: "pointer" };

					if (central) {
						// assuming lastSeen is a timestamp in milliseconds
						const now = Date.now(); // current timestamp in milliseconds
						const fiveMinutesAgo = now - 5 * 60 * 1000; // timestamp 5 minutes ago
						// Check if lastSeen is within the last 5 minutes
						if (lastSeen.getTime() >= fiveMinutesAgo) {
							// The user is considered online
							return (
								<span
									style={cursorStyle}
									className="text-success" // Change the className to whatever you use for positive/online statuses
									title="User is online"
								>
									ONLINE
								</span>
							);
						} else {
							// The user is considered offline
							return (
								<span style={cursorStyle} className="text-error" title="User is offline">
									{t("networkById.networkMembersTable.column.conStatus.offline")}
									<TimeAgo date={lastSeen} formatter={formatTime} title={lastSeen} />
								</span>
							);
						}
					}
					if (original.conStatus === ConnectionStatus.Controller) {
						return (
							<span
								style={cursorStyle}
								className="cursor-pointer text-warning"
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
								className="cursor-pointer text-warning"
								title={t("networkById.networkMembersTable.column.conStatus.toolTip")}
							>
								{t("networkById.networkMembersTable.column.conStatus.relayed")}
							</span>
						);
					}

					if (
						original.conStatus === ConnectionStatus.DirectLAN ||
						original.conStatus === ConnectionStatus.DirectWAN
					) {
						const directTitle =
							original.conStatus === ConnectionStatus.DirectLAN
								? t("networkById.networkMembersTable.column.conStatus.directLan")
								: t("networkById.networkMembersTable.column.conStatus.directWan");
						const versionInfo =
							original.peers?.version && original.peers.version !== "-1.-1.-1"
								? ` (v${original.peers.version})`
								: "";

						return (
							<div style={cursorStyle} className="text-success " title={directTitle}>
								{t("networkById.networkMembersTable.column.conStatus.direct", {
									version: versionInfo,
								})}{" "}
							</div>
						);
					}

					return (
						<span style={cursorStyle} className="text-error" title="User is offline">
							{t("networkById.networkMembersTable.column.conStatus.offline")}
							<TimeAgo date={lastSeen} formatter={formatTime} title={lastSeen} />
						</span>
					);
				},
			}),
			columnHelper.accessor("action", {
				header: () => (
					<span>{t("networkById.networkMembersTable.column.actions.header")}</span>
				),
				id: "action",
				cell: ({ row: { original } }) => {
					return (
						<div className="space-x-2">
							<button
								onClick={() =>
									callModal({
										title: (
											<p>
												{t("networkById.networkMembersTable.optionModalTitle")}{" "}
												<span className="text-primary">{`${
													original.name ? original.name : original.id
												}`}</span>
											</p>
										),
										rootStyle: "text-left",
										content: (
											<MemberOptionsModal
												nwid={original.nwid}
												memberId={original.id}
												central={central}
											/>
										),
									})
								}
								className="btn btn-outline btn-xs rounded-sm"
							>
								{t("networkById.networkMembersTable.column.actions.optionBtn")}
							</button>
						</div>
					);
				},
			}),
		],
		// this is needed so the ip in table is updated accordingly
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[networkById?.network],
	);

	return columns;
};
