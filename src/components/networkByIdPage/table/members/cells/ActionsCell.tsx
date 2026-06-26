import { useTranslations } from "next-intl";
import cn from "classnames";
import { useModalStore } from "~/utils/store";
import { MemberOptionsModal } from "~/components/networkByIdPage/memberOptionsModal";
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
 * permanently deletes (central) the member.
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

	return (
		<div className="space-x-2">
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
		</div>
	);
};
