"use client";
import { useState, useEffect, useRef, useTransition } from "react";
import React from "react";
import { useTranslations } from "next-intl";
import cn from "classnames";
import toast from "react-hot-toast";
import { useNetworkStore } from "~/store/networkStore";
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
	const network = useNetworkStore((state) => state.basicInfo);
	const [isPending, startTransition] = useTransition();

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [state, setState] = useState({
		toggleDescriptionInput: false,
		description: "",
	});
	const [isTextareaFocused, setTextareaFocused] = useState(false);

	useEffect(() => {
		setState((prev) => ({
			...prev,
			description: network?.description ?? "",
		}));
	}, [network?.description]);

	useEffect(() => {
		if (state.toggleDescriptionInput && textareaRef.current) {
			textareaRef.current.focus();
		}
	}, [state.toggleDescriptionInput]);

	const toggleDescriptionInput = () => {
		setState((prev) => ({
			...prev,
			toggleDescriptionInput: !prev.toggleDescriptionInput,
		}));
	};

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
				setState((prev) => ({
					...prev,
					toggleDescriptionInput: false,
				}));
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to update description",
				);
			}
		});
	};

	return (
		<div className="py-3 font-light">
			{!state.toggleDescriptionInput ? (
				<div
					onClick={toggleDescriptionInput}
					className="cursor-pointer border-l-4 border-primary p-2 leading-snug"
					style={{ caretColor: "transparent" }}
				>
					{network?.description || t("networkById.addDescription")}
				</div>
			) : (
				<form action={handleSubmit}>
					<input type="hidden" name="nwid" value={network?.id ?? ""} />
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
							defaultValue={state.description}
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
