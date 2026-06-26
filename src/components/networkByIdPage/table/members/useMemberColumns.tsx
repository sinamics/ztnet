import { useMemo } from "react";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { api } from "~/utils/api";
import { useTranslations } from "next-intl";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { type NetworkMemberNotation, type MemberEntity } from "~/types/local/member";
import { sortingMemberHex, sortingPhysicalIpAddress } from "~/utils/sorting";
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
 * Builds the members table column definitions. Memoized on the *props* only —
 * NOT on query data — because each column's `cell` is a function that
 * react-table's `flexRender` renders as a component *type*: a fresh array on
 * every background refetch would remount cells and drop focus from the inline
 * editors. Live network/user data is read at render time from `table.options.meta`
 * (a single subscription in the parent), so columns stay stable across refetches
 * yet rebuild correctly when the network/org/handlers change (e.g. navigation).
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
			await utils.network.getNetworkMembers.invalidate();
			refetchNetworkById();
		},
	});
	const { mutate: deleteMember } = api.networkMember.delete.useMutation({
		onSuccess: async () => {
			await utils.network.getNetworkById.invalidate({ nwid, central });
			await utils.network.getNetworkMembers.invalidate();
			refetchNetworkById();
		},
	});
	const { mutate: updateMember } = api.networkMember.Update.useMutation({
		onError: handleApiError,
		onSuccess: async () => {
			await utils.network.getNetworkById.invalidate({ nwid, central });
			await utils.network.getNetworkMembers.invalidate();
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
				cell: ({ getValue, row: { original }, table }) => (
					<AuthorizedCell
						checked={getValue()}
						deAuthorizeWarning={!!table.options.meta?.deAuthorizeWarning}
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
						showNotationMarker={!!ctx.table.options.meta?.showNotationMarker}
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
				enableSorting: false,
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
				enableSorting: false,
				cell: ({ row: { original }, table }) => (
					<IpAssignmentsCell
						original={original}
						nwid={nwid}
						network={table.options.meta?.network}
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
				enableSorting: false,
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
		// Depend on props only (never query data): stable across background
		// refetches — so inline editors keep focus — but rebuilds with correct
		// closures when the target network/org or handler changes (e.g. navigation).
		[nwid, central, organizationId, onEditingChange],
	);
};
