import cn from "classnames";
import { useRef } from "react";
import { useOnClickOutside } from "usehooks-ts";
import { useModalStore } from "~/utils/store";
import { useTranslations } from "next-intl";

const Modal = () => {
	const t = useTranslations("commonButtons");
	const ref = useRef(null);
	const {
		isOpen,
		description,
		content,
		title,
		rootStyle,
		showButtons = true,
		yesAction,
		toggleModal,
		disableClickOutside,
		closeModal,
	} = useModalStore((state) => state);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	useOnClickOutside(ref, () => {
		if (!disableClickOutside) {
			closeModal();
		}
	});
	const actionHandler = () => {
		yesAction();
		toggleModal();
	};
	const modalClass = cn({
		"modal transition-none z-20": true,
		"modal-open": isOpen,
	});

	return (
		<dialog className={modalClass}>
			<div
				className={cn("custom-scrollbar modal-box relative bg-base-100", rootStyle)}
				ref={ref}
			>
				<h3 className="text-lg font-bold">{title}</h3>
				<p className="py-4">{description}</p>
				<div>{content}</div>
				{showButtons ? (
					<div className="modal-action">
						{yesAction ? (
							<>
								{/* closes the modal */}
								<button className="btn" onClick={actionHandler}>
									{t("yes")}
								</button>
								<button className="btn" onClick={closeModal}>
									{t("cancel")}
								</button>
							</>
						) : (
							<button className="btn" onClick={closeModal}>
								{t("close")}
							</button>
						)}
					</div>
				) : null}
			</div>
		</dialog>
	);
};

export default Modal;
