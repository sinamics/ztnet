import { createColumnHelper } from "@tanstack/react-table";
import { type network_members } from "@prisma/client";
import { useModalStore } from "~/utils/store";
import { CopyToClipboard } from "react-copy-to-clipboard";
import toast from "react-hot-toast";
import CopyIcon from "~/icons/copy";
import { TruncateText } from "./TruncateText";
import { NetworkTableMemberCount } from "~/components/networkPage/networkTableMemberCount";
import NetworkOptionsModal from "~/components/networkPage/networkOptionsModal";

type ColumnsType = {
	name: string;
	description: string;
	nwid: string;
	members: network_members[];
	networkMembers: network_members[];
	action: string;
	memberCounts: {
		display: string;
	};
};

const columnHelper = createColumnHelper<ColumnsType>();

export const getTableColumns = (t: any) => {
	const callModal = useModalStore((state) => state.callModal);

	return [
		columnHelper.accessor("name", {
			cell: (info) => info.getValue(),
			header: () => <span>{t("commonTable.header.name")}</span>,
		}),
		columnHelper.accessor("description", {
			size: 300,
			cell: (info) => <TruncateText text={info.getValue()} />,
			header: () => <span>{t("commonTable.header.description")}</span>,
		}),
		columnHelper.accessor("nwid", {
			header: () => <span>{t("commonTable.header.networkId")}</span>,
			cell: ({ row: { original } }) => {
				return (
					<div onClick={(e) => e.stopPropagation()}>
						<CopyToClipboard
							text={original.nwid}
							onCopy={() => {
								toast.success(
									t("commonToast.copyToClipboard.success", { element: original.nwid }),
								);
							}}
							title={t("commonToast.copyToClipboard.title")}
						>
							<div className="cursor-pointer flex items-center justify-center">
								{original.nwid}
								<CopyIcon />
							</div>
						</CopyToClipboard>
					</div>
				);
			},
		}),
		columnHelper.accessor("members", {
			header: () => <span>{t("commonTable.header.memberActTot")}</span>,
			cell: ({ row: { original } }) => {
				if (!Array.isArray(original.networkMembers)) {
					return <NetworkTableMemberCount count="0" />;
				}
				return <NetworkTableMemberCount count={original.memberCounts.display} />;
			},
		}),
		columnHelper.accessor("action", {
			header: () => <span>{t("commonTable.header.actions")}</span>,
			id: "action",
			cell: ({ row: { original } }) => {
				return (
					<div className="space-x-2">
						<button
							onClick={(event) => {
								event.stopPropagation();
								callModal({
									title: (
										<p>
											<span>
												{t.rich("networks.networkActionModal.modalTitle", {
													span: (children) => (
														<span className="text-primary">{children}</span>
													),
													networkName: original.nwid,
												})}
											</span>
										</p>
									),
									rootStyle: "text-left",
									content: <NetworkOptionsModal networkId={original.nwid} />,
								});
							}}
							className="btn btn-outline btn-xs rounded-sm"
						>
							{t("commonTable.cell.Options")}
						</button>
					</div>
				);
			},
		}),
	];
};
