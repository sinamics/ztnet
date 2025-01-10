"use client";
import { useState, useEffect } from "react";
import React from "react";
import { useTranslations } from "next-intl";
import { api } from "~/utils/api";
import cn from "classnames";
import toast from "react-hot-toast";
import { useTrpcApiErrorHandler } from "~/hooks/useTrpcApiHandler";
import { useParams } from "next/navigation";
import { useNetworkStore } from "~/store/networkStore";

interface IProp {
	central?: boolean;
	organizationId?: string;
}

const NetworkDescription = ({ central = false, organizationId }: IProp) => {
	const t = useTranslations();
	const network = useNetworkStore((state) => state.basicInfo);
	// console.log("NetworkDescription network", network);
	const handleApiError = useTrpcApiErrorHandler();

	const textareaRef = React.useRef<HTMLTextAreaElement>(null); // <-- Create a ref for the textarea
	const [state, setState] = useState({
		toggleDescriptionInput: false,
		description: "",
	});

	useEffect(() => {
		if (state.toggleDescriptionInput && textareaRef.current) {
			textareaRef.current.focus(); // <-- Programmatically set focus when toggleDescriptionInput is true
		}
	}, [state.toggleDescriptionInput]);

	const [isTextareaFocused, setTextareaFocused] = useState(false);

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
	const urlParams = useParams();

	useEffect(() => {
		setState((prev) => ({
			...prev,
			description: network?.description,
		}));
	}, [network?.description]);

	const { mutate: networkDescription } = api.network.networkDescription.useMutation({
		onSuccess: () => {
			toast.success("Description updated successfully");
		},
		onError: handleApiError,
	});

	const toggleDescriptionInput = () => {
		setState({
			...state,
			toggleDescriptionInput: !state.toggleDescriptionInput,
		});
	};
	const eventHandler = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		setState({ ...state, [e.target.name]: e.target.value });
	};
	// if (errorNetwork) {
	// 	return (
	// 		<div className="flex flex-col items-center justify-center">
	// 			<h1 className="text-center text-2xl font-semibold">{errorNetwork.message}</h1>
	// 			<ul className="list-disc">
	// 				<li>{t("networkById.errorSteps.step1")}</li>
	// 				<li>{t("networkById.errorSteps.step2")}</li>
	// 			</ul>
	// 		</div>
	// 	);
	// }

	// if (loadingNetwork) {
	// 	// add loading progress bar to center of page, vertially and horizontally
	// 	return (
	// 		<div className="flex flex-col items-center justify-center">
	// 			<h1 className="text-center text-2xl font-semibold">
	// 				<progress className="progress progress-primary w-56"></progress>
	// 			</h1>
	// 		</div>
	// 	);
	// }

	return (
		<div className="py-3 font-light">
			{!state.toggleDescriptionInput ? (
				network?.description ? (
					<div
						onClick={toggleDescriptionInput}
						className="cursor-pointer border-l-4 border-primary p-2 leading-snug"
						style={{ caretColor: "transparent" }}
					>
						{network?.description}
					</div>
				) : (
					<div
						onClick={toggleDescriptionInput}
						className="cursor-pointer border-l-4 border-primary p-2 leading-snug"
						style={{ caretColor: "transparent" }}
					>
						{t("networkById.addDescription")}
					</div>
				)
			) : (
				<form>
					<div
						className={cn("w-full", { tooltip: isTextareaFocused })}
						data-tip={t("input.enterToSave")}
					>
						<textarea
							ref={textareaRef}
							rows={3}
							value={state?.description}
							name="description"
							onChange={eventHandler}
							maxLength={255}
							style={{ maxHeight: "100px" }}
							className="custom-scrollbar textarea textarea-primary w-full leading-snug "
							placeholder={t("networkById.descriptionPlaceholder")}
							onFocus={handleTextareaFocus}
							onBlur={handleTextareaBlur}
							onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									// submit form when Enter key is pressed and Shift key is not held down.
									const target = e.target as HTMLTextAreaElement;
									networkDescription(
										{
											nwid: network?.id || "",
											central,
											organizationId,
											updateParams: { description: target.value },
										},
										{
											onSuccess: () => {
												setState({
													...state,
													toggleDescriptionInput: !state.toggleDescriptionInput,
												});
											},
										},
									);
								}
							}}
						></textarea>
					</div>
				</form>
			)}
		</div>
	);
};

export default NetworkDescription;
