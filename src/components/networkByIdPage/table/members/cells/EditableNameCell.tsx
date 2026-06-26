import { useEffect, useRef, useState } from "react";
import type { CellContext } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import Input from "~/components/elements/input";
import { convertRGBtoRGBA } from "~/utils/randomColor";
import type { MemberEntity } from "~/types/local/member";

interface Props {
	ctx: CellContext<MemberEntity, unknown>;
	central: boolean;
	showNotationMarker: boolean;
	onSubmit: (value: string, memberId: string) => void;
	onEditingChange?: (editing: boolean) => void;
}

/**
 * Inline-editable member name. Commits on blur (deduped via isSubmittingRef) and
 * optimistically updates the table's local row data. Shows notation colour
 * markers in non-central networks when the user option is enabled.
 */
export const EditableNameCell = ({
	ctx,
	central,
	showNotationMarker,
	onSubmit,
	onEditingChange,
}: Props) => {
	const {
		getValue,
		row: { index, original },
		column: { id },
		table,
	} = ctx;
	const t = useTranslations();
	const initialValue = (getValue() as string) ?? "";

	const inputRef = useRef<HTMLInputElement>(null);
	const isSubmittingRef = useRef(false);
	const editingSignaledRef = useRef(false);
	const [value, setValue] = useState(initialValue);
	const [isUserEditing, setIsUserEditing] = useState(false);

	const notations = original.notations || [];

	// Idempotently tell the table whether this editor is focused, so it can pause
	// applying background data refreshes. Guarded so the count can't drift.
	const signalEditing = (editing: boolean) => {
		if (editing === editingSignaledRef.current) return;
		editingSignaledRef.current = editing;
		onEditingChange?.(editing);
	};

	// Sync external updates only while the user is not actively editing.
	useEffect(() => {
		if (!isUserEditing) setValue(initialValue);
	}, [initialValue, isUserEditing]);

	// Safety net: release the editing lock if this cell unmounts while focused.
	useEffect(() => {
		return () => {
			if (editingSignaledRef.current) onEditingChange?.(false);
		};
	}, [onEditingChange]);

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

	return (
		<div className="w-full">
			<form
				className="w-full"
				onSubmit={(e) => {
					e.preventDefault();
					commit();
					inputRef.current?.blur();
				}}
			>
				<div className="flex items-center w-full">
					{!central &&
						showNotationMarker &&
						notations?.map((notation) => (
							<div
								key={notation.label?.name}
								className="flex-shrink-0 inline-block h-5 w-5 rounded-full mr-2"
								title={notation.label?.name}
								style={{
									backgroundColor: convertRGBtoRGBA(notation.label?.color, 1),
								}}
							/>
						))}
					<div className="flex-grow w-full">
						<Input
							useTooltip
							ref={inputRef}
							placeholder={t("networkById.networkMembersTable.tableRow.updateName")}
							name="memberName"
							onChange={(e) => setValue(e.target.value)}
							onFocus={() => {
								setIsUserEditing(true);
								signalEditing(true);
							}}
							onBlur={commit}
							value={value || ""}
							type="text"
							className="input-primary input-sm m-0 border-0 bg-transparent p-0 min-w-full whitespace-normal break-words text-sm"
						/>
					</div>
				</div>
				<button type="submit" className="hidden" />
			</form>
		</div>
	);
};
