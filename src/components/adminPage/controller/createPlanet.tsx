import type React from "react";
import RootForm from "./rootForm";
import { useTranslations } from "next-intl";
import type { Planet } from "@prisma/client";

interface IProps {
	getPlanet: Planet & { error?: Error };
	open: boolean;
	setOpen: (open: boolean) => void;
	resetWorld: () => void;
	handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	triggerFileInput: () => void;
	closeForm: () => void;
}
const CreatePlanet = ({
	getPlanet,
	open,
	setOpen,
	resetWorld,
	handleFileChange,
	triggerFileInput,
	closeForm,
}: IProps) => {
	const t = useTranslations("admin");

	if (getPlanet?.error) {
		return (
			<div role="alert" className="alert alert-error mt-10">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="stroke-current shrink-0 h-6 w-6"
					fill="none"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
				<span>{getPlanet?.error?.message}</span>
				<div>
					<button onClick={() => resetWorld()} className="btn btn-sm">
						Reset
					</button>
				</div>
			</div>
		);
	}
	return (
		<div>
			<div className="flex w-full justify-between">
				<div className={"cursor-pointer"}>
					<div className="flex font-medium">
						<span>{t("controller.generatePlanet.generatePrivateRootLabel")}</span>
					</div>
					<div>
						<p className="m-0 p-0 text-xs text-gray-500">
							{t("controller.generatePlanet.generatePrivateRootPlaceholder")}
						</p>
					</div>
				</div>
				<div className="flex gap-3">
					<button
						onClick={() => setOpen(!open)}
						data-testid="view-form"
						className="btn btn-sm"
					>
						{t("controller.generatePlanet.buttons.createPlanet")}
					</button>
					<input
						type="file"
						id="fileInput"
						style={{ display: "none" }}
						onChange={handleFileChange}
						accept=".zip"
					/>
					<button
						data-testid="view-form"
						className="btn btn-sm"
						onClick={triggerFileInput}
					>
						{t("controller.generatePlanet.buttons.uploadConfig")}
					</button>
				</div>
			</div>
			{open ? <RootForm onClose={closeForm} /> : null}
		</div>
	);
};

export default CreatePlanet;
