import { createColumnHelper } from "@tanstack/react-table";
import { MemberEntity } from "~/types/local/member";
import { RoutesEntity } from "~/types/local/network";

const columnHelper = createColumnHelper<RoutesEntity>();

export const networkRoutesColumns = (
	deleteRoute: (route: RoutesEntity) => void,
	isUpdating: boolean,
	members: MemberEntity[],
) => [
	columnHelper.accessor("target", {
		header: "Destination",
		cell: (info) => info.getValue(),
	}),
	columnHelper.accessor("via", {
		header: "Via",
		cell: (info) => (
			<div className="text-xs opacity-30 md:text-base">
				{info.row.original.via || "LAN"}
			</div>
		),
	}),
	columnHelper.accessor("nodeName", {
		header: "Node Name",
		cell: (info) => {
			// check if ipAssignments has the via ip and return the node name
			const node = members?.find((member) =>
				member.ipAssignments.includes(info.row.original.via),
			);
			return node?.name || "N/A";
		},
	}),
	columnHelper.accessor("notes", {
		header: "Notes",
	}),
	columnHelper.accessor("actions", {
		header: "",
		cell: (info) => (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				strokeWidth="1.5"
				stroke="currentColor"
				className="h-5 w-5 cursor-pointer hover:text-primary"
				onClick={() => !isUpdating && deleteRoute(info.row.original)}
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
				/>
			</svg>
		),
	}),
];
