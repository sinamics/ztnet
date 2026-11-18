import { useTranslations } from "next-intl";
import cn from "classnames";
import { useModalStore } from "~/utils/store";
import { MemberOptionsModal } from "~/components/networkByIdPage/memberOptionsModal";
import { MemberNotesModal } from "~/components/networkByIdPage/memberNotesModal";
import { api } from "~/utils/api";
import type { MemberEntity } from "~/types/local/member";

interface Props {
	original: MemberEntity;
	central: boolean;
	organizationId?: string;
	onStash: (memberId: string) => void;
	onDelete: (memberId: string) => void;
}

/**
 * Row actions: opens the member options modal, and either stashes (local) or
 * permanently deletes (central) the member. Local members also get an icon-only
 * Notes button, so all the actions stay on one line.
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
					: "flex flex-nowrap items-center justify-center gap-2"
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
				// The tooltip lives on the wrapper: browsers don't show `title` on a disabled button.
				<span
					title={
						canViewNotes ? b("notes") : t("networkById.networkMembersTable.notesNoAccess")
					}
				>
					<button
						disabled={!canViewNotes}
						aria-label={b("notes")}
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
						className="btn btn-outline btn-xs relative rounded-sm px-1.5"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							className="h-4 w-4"
							aria-hidden="true"
						>
							<path d="M4 3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8.586a2 2 0 0 0 1.414-.586l2.414-2.414A2 2 0 0 0 17 12.586V5a2 2 0 0 0-2-2H4Zm2 4a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1Zm1 3a1 1 0 1 0 0 2h3a1 1 0 1 0 0-2H7Z" />
						</svg>
						{canViewNotes && hasNotes ? (
							<span className="absolute -right-1 -top-1 inline-block h-2 w-2 rounded-full bg-primary" />
						) : null}
					</button>
				</span>
			)}
		</div>
	);
};
