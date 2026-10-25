import { useTranslations } from "next-intl";
import cn from "classnames";
import { useModalStore } from "~/utils/store";
import { MemberOptionsModal } from "~/components/networkByIdPage/memberOptionsModal";
import { MemberNotesModal } from "~/components/networkByIdPage/memberNotesModal";
import { api } from "~/utils/api";
import type { MemberEntity } from "~/types/local/member";

// Placeholder for the optional credentials feature (#1028); hidden until implemented.
const SHOW_CREDENTIALS = false;

interface Props {
	original: MemberEntity;
	central: boolean;
	organizationId?: string;
	onStash: (memberId: string) => void;
	onDelete: (memberId: string) => void;
}

/**
 * Row actions: opens the member options modal, and either stashes (local) or
 * permanently deletes (central) the member. Local members also get a Notes button.
 */
export const ActionsCell = ({
	original,
	central,
	organizationId,
	onStash,
	onDelete,
}: Props) => {
	const b = useTranslations("commonButtons");
	const t = useTranslations();
	const callModal = useModalStore((state) => state.callModal);

	const { data: notedMembers } = api.networkMember.getNotedMemberIds.useQuery(
		{ nwid: original.nwid },
		{ enabled: !central },
	);
	const canViewNotes = notedMembers?.canView ?? false;
	const hasNotes = !!notedMembers?.memberIds.includes(original.id);

	return (
		<div
			className={
				central
					? "flex flex-wrap items-center justify-center gap-2"
					: "mx-auto grid w-fit grid-cols-2 gap-2 [&>button]:w-full"
			}
		>
			<button
				onClick={() =>
					callModal({
						title: (
							<p>
								{t("networkById.networkMembersTable.optionModalTitle")}{" "}
								<span className="text-primary">{original.name || original.id}</span>
							</p>
						),
						rootStyle: "text-left max-w-4xl w-full",
						content: (
							<MemberOptionsModal
								nwid={original.nwid}
								memberId={original.id}
								central={central}
								organizationId={organizationId}
							/>
						),
					})
				}
				className="btn btn-outline btn-xs rounded-sm"
			>
				{b("options")}
			</button>
			{central ? (
				<button
					onClick={() => onDelete(original.id)}
					className="btn btn-error btn-outline btn-xs rounded-sm"
				>
					{b("delete")}
				</button>
			) : (
				<button
					onClick={() => onStash(original.id)}
					className={cn("btn btn-outline btn-xs rounded-sm", {
						"btn-warning": !central,
						"btn-error": central,
					})}
				>
					{b("stash")}
				</button>
			)}
			{central ? null : (
				<>
					<button
						disabled={!canViewNotes}
						title={
							canViewNotes
								? undefined
								: t("networkById.networkMembersTable.notesNoAccess")
						}
						onClick={() =>
							callModal({
								title: (
									<p>
										{t("networkById.networkMembersTable.notesModalTitle")}{" "}
										<span className="text-primary">{original.name || original.id}</span>
									</p>
								),
								rootStyle: "text-left max-w-2xl w-full",
								showButtons: false,
								content: <MemberNotesModal nwid={original.nwid} memberId={original.id} />,
							})
						}
						className="btn btn-outline btn-xs rounded-sm"
					>
						{b("notes")}
						{canViewNotes && hasNotes ? (
							<span className="ml-1 inline-block h-2 w-2 rounded-full bg-primary" />
						) : null}
					</button>
					{SHOW_CREDENTIALS ? (
						<button
							disabled
							title={t("networkById.networkMembersTable.credentialsSoon")}
							className="btn btn-outline btn-xs rounded-sm"
						>
							{b("credentials")}
						</button>
					) : null}
				</>
			)}
		</div>
	);
};
