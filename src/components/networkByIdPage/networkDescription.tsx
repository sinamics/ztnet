"use client";
import { useState, useEffect, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import cn from "classnames";
import toast from "react-hot-toast";
import {
	useNetworkDescription,
	useNetworkField,
	NetworkSection,
} from "~/store/networkStore";
import { updateNetworkDescription } from "~/features/network/server/actions/updateNetworkDescription";

interface NetworkDescriptionProps {
	central?: boolean;
	organizationId?: string;
}

export default function NetworkDescription({
	central = false,
	organizationId,
}: NetworkDescriptionProps) {
	const t = useTranslations();
	const description = useNetworkDescription();
	const networkId = useNetworkField(NetworkSection.BASIC_INFO, "id");

	const [isPending, startTransition] = useTransition();
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [isEditing, setIsEditing] = useState(false);
	const [isTextareaFocused, setTextareaFocused] = useState(false);

	// Focus textarea when entering edit mode
	useEffect(() => {
		if (isEditing && textareaRef.current) {
			textareaRef.current.focus();
		}
	}, [isEditing]);

	const handleTextareaFocus = () => {
		setTextareaFocused(true);
		if (textareaRef.current) {
			const length = textareaRef.current.value.length;
			textareaRef.current.selectionStart = length;
			textareaRef.current.selectionEnd = length;
		}
	};

	const handleTextareaBlur = () => {
		setTextareaFocused(false);
	};

	const handleSubmit = async (formData: FormData) => {
		startTransition(async () => {
			try {
				await updateNetworkDescription(formData);
				toast.success("Description updated successfully");
				setIsEditing(false);
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to update description",
				);
			}
		});
	};

	return (
		<div className="py-3 font-light">
			{!isEditing ? (
				<div
					onClick={() => setIsEditing(true)}
					className="cursor-pointer border-l-4 border-primary p-2 leading-snug"
					style={{ caretColor: "transparent" }}
				>
					{description || t("networkById.addDescription")}
				</div>
			) : (
				<form action={handleSubmit}>
					<input type="hidden" name="nwid" value={networkId ?? ""} />
					<input type="hidden" name="central" value={central.toString()} />
					{organizationId && (
						<input type="hidden" name="organizationId" value={organizationId} />
					)}
					<div
						className={cn("w-full", { tooltip: isTextareaFocused })}
						data-tip={t("input.enterToSave")}
					>
						<textarea
							ref={textareaRef}
							rows={3}
							name="description"
							defaultValue={description}
							maxLength={255}
							style={{ maxHeight: "100px" }}
							className="custom-scrollbar textarea textarea-primary w-full leading-snug"
							placeholder={t("networkById.descriptionPlaceholder")}
							onFocus={handleTextareaFocus}
							onBlur={handleTextareaBlur}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									const form = e.currentTarget.form;
									if (form) form.requestSubmit();
								}
							}}
							disabled={isPending}
						/>
					</div>
				</form>
			)}
		</div>
	);
}
