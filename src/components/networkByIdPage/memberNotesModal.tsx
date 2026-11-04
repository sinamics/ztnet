import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "~/utils/api";
import { useModalStore } from "~/utils/store";
import { MEMBER_NOTES_MAX_LENGTH } from "~/utils/memberNotes";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";

interface Props {
	nwid: string;
	memberId: string;
}

/**
 * Free-text notes for a single network member. READ_ONLY users cannot see them;
 * USER and above can read and edit them (the server decides via `canEdit`).
 */
export const MemberNotesModal = ({ nwid, memberId }: Props) => {
	const t = useTranslations();
	const b = useTranslations("commonButtons");
	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();
	const closeModal = useModalStore((state) => state.closeModal);
	const utils = api.useUtils();

	const { data, isLoading } = api.networkMember.getMemberNotes.useQuery({
		nwid,
		memberId,
	});
	const [notes, setNotes] = useState("");

	useEffect(() => {
		if (data) setNotes(data.notes);
	}, [data]);

	const { mutate: save, isPending } = api.networkMember.updateMemberNotes.useMutation({
		onSuccess: handleApiSuccess({
			actions: [
				() => void utils.networkMember.getNotedMemberIds.invalidate({ nwid }),
				() => void utils.networkMember.getMemberNotes.invalidate({ nwid, memberId }),
				() => closeModal?.(),
			],
		}),
		onError: handleApiError,
	});

	const canEdit = data?.canEdit ?? false;

	return (
		<div className="space-y-3">
			<textarea
				className="textarea textarea-bordered min-h-48 w-full"
				placeholder={t("networkById.networkMembersTable.notesPlaceholder")}
				value={notes}
				maxLength={MEMBER_NOTES_MAX_LENGTH}
				disabled={isLoading || !canEdit}
				onChange={(e) => setNotes(e.target.value)}
			/>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<span className="text-xs opacity-60">
					{canEdit
						? `${notes.length} / ${MEMBER_NOTES_MAX_LENGTH}`
						: t("networkById.networkMembersTable.notesReadOnly")}
				</span>
				<div className="flex gap-2">
					<button className="btn btn-sm" onClick={() => closeModal?.()}>
						{b("cancel")}
					</button>
					{canEdit ? (
						<button
							className="btn btn-primary btn-sm"
							disabled={isPending || notes === (data?.notes ?? "")}
							onClick={() => save({ nwid, memberId, notes })}
						>
							{b("save")}
						</button>
					) : null}
				</div>
			</div>
		</div>
	);
};
