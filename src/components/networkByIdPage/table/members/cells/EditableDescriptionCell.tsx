import { useEffect, useRef, useState } from "react";
import type { CellContext } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import type { MemberEntity } from "~/types/local/member";

interface Props {
	ctx: CellContext<MemberEntity, unknown>;
	onSubmit: (value: string, memberId: string) => void;
	onEditingChange?: (editing: boolean) => void;
}

/**
 * Click-to-edit member description. Renders as plain text until clicked, then a
 * auto-resizing textarea (max 500 chars, with counter). Enter commits, Shift+Enter
 * adds a newline, Escape cancels. Commits on blur, deduped via isSubmittingRef.
 */
export const EditableDescriptionCell = ({ ctx, onSubmit, onEditingChange }: Props) => {
	const {
		getValue,
		row: { index, original },
		column: { id },
		table,
	} = ctx;
	const t = useTranslations();
	const initialValue = (getValue() as string) ?? "";

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const isSubmittingRef = useRef(false);
	const editingSignaledRef = useRef(false);
	const [value, setValue] = useState(initialValue);
	const [isUserEditing, setIsUserEditing] = useState(false);
	const [isEditing, setIsEditing] = useState(false);

	// Idempotently tell the table whether this editor is active, so it can pause
	// applying background data refreshes. Guarded so the count can't drift.
	const signalEditing = (editing: boolean) => {
		if (editing === editingSignaledRef.current) return;
		editingSignaledRef.current = editing;
		onEditingChange?.(editing);
	};

	// Safety net: release the editing lock if this cell unmounts while editing.
	useEffect(() => {
		return () => {
			if (editingSignaledRef.current) onEditingChange?.(false);
		};
	}, [onEditingChange]);

	const textValue = value ?? "";
	const isEmpty = textValue.trim().length === 0;

	useEffect(() => {
		if (!isUserEditing) setValue(initialValue);
	}, [initialValue, isUserEditing]);

	// Auto-resize the textarea to its content while editing.
	useEffect(() => {
		if (isEditing && textareaRef.current) {
			const textarea = textareaRef.current;
			textarea.style.height = "auto";
			textarea.style.height = `${textarea.scrollHeight}px`;
			textarea.focus();
		}
	}, [isEditing]);

	const commit = () => {
		setIsUserEditing(false);
		signalEditing(false);
		if (value !== initialValue && !isSubmittingRef.current) {
			isSubmittingRef.current = true;
			onSubmit(value, original.id);
			setTimeout(() => {
				isSubmittingRef.current = false;
			}, 100);
		}
		table.options.meta?.updateData(index, id, value);
	};

	const handleBlur = () => {
		setIsEditing(false);
		commit();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			setValue(initialValue);
			setIsEditing(false);
			setIsUserEditing(false);
			signalEditing(false);
		} else if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			setIsEditing(false);
			commit();
		}
	};

	if (isEditing) {
		return (
			<div className="w-full">
				<div className="flex items-start w-full">
					<div className="flex-grow w-full">
						<textarea
							ref={textareaRef}
							placeholder={t(
								"networkById.networkMembersTable.tableRow.updateDescription",
							)}
							name="memberDescription"
							maxLength={500}
							onChange={(e) => {
								setValue(e.target.value);
								e.target.style.height = "auto";
								e.target.style.height = `${e.target.scrollHeight}px`;
							}}
							onBlur={handleBlur}
							onKeyDown={handleKeyDown}
							value={textValue}
							className="bg-transparent border border-primary rounded px-2 py-1 min-w-full text-sm resize-none whitespace-normal break-words focus:outline-none"
							style={{ minHeight: "2rem" }}
						/>
						<div className="text-xs text-gray-400 mt-1">{textValue.length}/500</div>
					</div>
				</div>
			</div>
		);
	}

	const handleCellClick = () => {
		setIsEditing(true);
		setIsUserEditing(true);
		signalEditing(true);
	};

	return (
		<span
			className={
				isEmpty ? "text-gray-400 italic cursor-pointer text-sm" : "cursor-pointer text-sm"
			}
			onClick={handleCellClick}
			style={{ textAlign: "left", display: "block" }}
		>
			{isEmpty
				? t("networkById.networkMembersTable.tableRow.updateDescription")
				: textValue}
		</span>
	);
};
