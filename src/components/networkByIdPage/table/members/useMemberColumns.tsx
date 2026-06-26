import { useMemo } from "react";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { api } from "~/utils/api";
import { useTranslations } from "next-intl";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { type NetworkMemberNotation, type MemberEntity } from "~/types/local/member";
import {
	sortingIpAddress,
	sortingMemberHex,
	sortingPhysicalIpAddress,
} from "~/utils/sorting";
import { COLUMN_SIZING } from "./constants";
import { AuthorizedCell } from "./cells/AuthorizedCell";
import { EditableNameCell } from "./cells/EditableNameCell";
import { EditableDescriptionCell } from "./cells/EditableDescriptionCell";
import { IpAssignmentsCell } from "./cells/IpAssignmentsCell";
import { PhysicalAddressCell } from "./cells/PhysicalAddressCell";
import { ConnectionStatusCell } from "./cells/ConnectionStatusCell";
import { ActionsCell } from "./cells/ActionsCell";

interface IProp {
	nwid: string;
	central: boolean;
	organizationId?: string;
	/** Signals when an inline editor gains/loses focus, so the table can pause
	 * applying background data refreshes while editing. */
	onEditingChange?: (editing: boolean) => void;
}

const leftAligned = { meta: { style: { textAlign: "left" as const } } };

/**
 * Builds the members table column definitions. The column array is memoized with
 * a STABLE identity (empty deps): each column's `cell` is a function, and
 * react-table's `flexRender` renders cell functions as component *types* — so a
 * fresh array on every refetch would remount cells and drop focus from the inline
 * editors. Cells that need live network/user data subscribe to it themselves
 * (the queries are cached/deduped), keeping these definitions stable.
 */
export const useMemberColumns = ({
	nwid,
	central = false,
	organizationId,
	onEditingChange,
}: IProp) => {
	const c = useTranslations("commonTable");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const utils = api.useUtils();
	const { refetch: refetchNetworkById } = api.network.getNetworkById.useQuery(
		{ nwid, central },
		{ enabled: !!nwid },
	);

	const { mutate: stashUser } = api.networkMember.stash.useMutation({
		onSuccess: async () => {
			await utils.network.getNetworkById.invalidate({ nwid, central });
			refetchNetworkById();
		},
	});
	const { mutate: deleteMember } = api.networkMember.delete.useMutation({
		onSuccess: async () => {
			await utils.network.getNetworkById.invalidate({ nwid, central });
			refetchNetworkById();
		},
	});
	const { mutate: updateMember } = api.networkMember.Update.useMutation({
		onError: handleApiError,
		onSuccess: async () => {
			await utils.network.getNetworkById.invalidate({ nwid, central });
			handleApiSuccess({ actions: [refetchNetworkById] })();
		},
	});

	const update = (memberId: string, updateParams: Record<string, unknown>) =>
		updateMember({ updateParams, memberId, organizationId, nwid, central });

	const doAuthorize = (memberId: string, authorized: boolean) =>
		updateMember(
			{ nwid, memberId, central, organizationId, updateParams: { authorized } },
			{ onSuccess: () => void refetchNetworkById() },
		);

	const handleDeleteIp = (ipAssignments: string[], ip: string, memberId: string) =>
		update(memberId, { ipAssignments: ipAssignments.filter((r) => r !== ip) });

	const onStash = (memberId: string) =>
		stashUser(
			{ nwid, id: memberId, organizationId },
			{ onSuccess: () => void refetchNetworkById() },
		);
	const onDelete = (memberId: string) =>
		deleteMember({ central, id: memberId, nwid, organizationId });

	const columnHelper = createColumnHelper<MemberEntity>();
	// biome-ignore lint/correctness/useExhaustiveDependencies: build once — see doc comment above
	return useMemo<ColumnDef<MemberEntity>[]>(
		() => [
			columnHelper.accessor(
				(row) => {
					const notations = (row as unknown as { notations?: NetworkMemberNotation[] })
						?.notations;
					return (notations ?? []).map((tag) => tag?.label?.name).join(", ");
				},
				{ header: () => "Notations", id: "notations" },
			),
			columnHelper.accessor("authorized", {
				header: () => <span>{c("header.authorized")}</span>,
				id: "authorized",
				...COLUMN_SIZING.authorized,
				cell: ({ getValue, row: { original } }) => (
					<AuthorizedCell
						checked={getValue()}
						onAuthorize={(authorized) => doAuthorize(original.id, authorized)}
					/>
				),
			}),
			columnHelper.accessor("name", {
				header: () => <span>{c("header.name")}</span>,
				id: "name",
				...COLUMN_SIZING.name,
				...leftAligned,
				cell: (ctx) => (
					<EditableNameCell
						ctx={ctx}
						central={central}
						onEditingChange={onEditingChange}
						onSubmit={(value, memberId) => update(memberId, { name: value })}
					/>
				),
			}),
			columnHelper.accessor("description", {
				header: () => <span>{c("header.description")}</span>,
				id: "description",
				...COLUMN_SIZING.description,
				...leftAligned,
				cell: (ctx) => (
					<EditableDescriptionCell
						ctx={ctx}
						onEditingChange={onEditingChange}
						onSubmit={(value, memberId) => update(memberId, { description: value })}
					/>
				),
			}),
			columnHelper.accessor("id", {
				header: () => <span>{c("header.id")}</span>,
				id: "id",
				...COLUMN_SIZING.id,
				sortingFn: sortingMemberHex,
				cell: (info) => <span className="text-sm">{info.getValue()}</span>,
			}),
			columnHelper.accessor("ipAssignments", {
				header: () => <span>{c("header.ipAssignments.header")}</span>,
				id: "ipAssignments",
				...COLUMN_SIZING.ipAssignments,
				...leftAligned,
				sortingFn: sortingIpAddress,
				cell: ({ row: { original } }) => (
					<IpAssignmentsCell
						original={original}
						nwid={nwid}
						central={central}
						onDeleteIp={handleDeleteIp}
					/>
				),
			}),
			columnHelper.accessor((row) => row?.physicalAddress, {
				header: () => <span>{c("header.physicalIp.header")}</span>,
				id: "physicalAddress",
				...COLUMN_SIZING.physicalAddress,
				sortDescFirst: true,
				sortUndefined: -1,
				sortingFn: sortingPhysicalIpAddress,
				cell: ({ row: { original } }) => (
					<PhysicalAddressCell original={original} central={central} />
				),
			}),
			columnHelper.accessor("conStatus", {
				header: () => <span>{c("header.conStatus.header")}</span>,
				id: "conStatus",
				...COLUMN_SIZING.conStatus,
				cell: ({ row: { original } }) => (
					<ConnectionStatusCell original={original} central={central} />
				),
			}),
			columnHelper.accessor("action", {
				header: () => <span>{c("header.actions")}</span>,
				id: "action",
				...COLUMN_SIZING.action,
				enableSorting: false,
				cell: ({ row: { original } }) => (
					<ActionsCell
						original={original}
						central={central}
						organizationId={organizationId}
						onStash={onStash}
						onDelete={onDelete}
					/>
				),
			}),
		],
		// Build once: keeps cell function identities stable so inline editors don't
		// remount (and lose focus) when the network/member queries refetch.
		[],
	);
};
