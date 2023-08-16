import { useTranslations } from "next-intl";
import React from "react";
import toast from "react-hot-toast";
import InputField from "~/components/elements/inputField";
import { api } from "~/utils/api";
import { useModalStore } from "~/utils/store";

const PrivateRoot = () => {
	const t = useTranslations("admin");

	const { callModal } = useModalStore((state) => state);
	const { data: getWorld } = api.admin.getWorld.useQuery();

	const { data: globalOptions, refetch: refetchOptions } =
		api.settings.getAllOptions.useQuery();

	const { mutate: makeWorld } = api.admin.makeWorld.useMutation({
		onSuccess: () => {
			refetchOptions();
			callModal({
				title: <p>{t("controller.generatePlanet.noteTitle")}</p>,
				rootStyle: "text-left border border-yellow-300/30",
				showButtons: true,
				closeModalOnSubmit: true,
				content: (
					<span>
						{t("controller.generatePlanet.customPlanetGenerated")}
						<br />
						<p>
							{t.rich(
								"controller.generatePlanet.restartContainerInstructions",
								{
									span: (content) => (
										<span className="text-yellow-300">{content} </span>
									),
									br: () => <br />,
								},
							)}
						</p>
					</span>
				),
			});
		},
	});
	const { mutate: resetWorld } = api.admin.resetWorld.useMutation({
		onSuccess: () => {
			refetchOptions();
			toast.success("Planet file has been restored!");
		},
	});
	async function downloadPlanet() {
		try {
			const response = await fetch("/api/planet");
			if (!response.ok) {
				throw new Error("Network response was not ok");
			}
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.style.display = "none";
			a.href = url;
			// the filename you want
			a.download = "planet.custom";
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error("There was an error downloading the file:", error);
		}
	}

	return (
		<div className="space-y-4">
			<div>
				<p className="text-sm text-gray-500 pb-4">
					{t("controller.generatePlanet.updatePlanetWarning")}
				</p>

				{globalOptions?.customPlanetUsed ? (
					<div className="space-y-4">
						<div className="alert">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								className="stroke-info shrink-0 w-6 h-6"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								></path>
							</svg>
							<span>{t("controller.generatePlanet.customPlanetInUse")}</span>
						</div>
						<div className="flex justify-between">
							<div className="join">
								{/* <div>
									<div>
										<input
											className="input input-bordered join-item"
											placeholder="example@mail.com"
										/>
									</div>
								</div> */}
								<div className="">
									{/* <button className="btn join-item">INVITE USER</button> */}

									<button
										onClick={() => downloadPlanet()}
										className="btn join-item bg-primary"
									>
										{t("controller.generatePlanet.downloadPlanetButton")}
									</button>
								</div>
							</div>
							<button
								onClick={() => resetWorld()}
								className="btn btn-outline btn-error"
							>
								{t("controller.generatePlanet.restoreOriginalPlanetButton")}
							</button>
						</div>
					</div>
				) : (
					<InputField
						isLoading={false}
						label={t("controller.generatePlanet.generatePrivateRootLabel")}
						placeholder={t(
							"controller.generatePlanet.generatePrivateRootPlaceholder",
						)}
						size="sm"
						buttonText="ADD"
						rootFormClassName="space-y-3 "
						rootClassName=""
						labelClassName="text-sm leading-tight py-1"
						fields={[
							{
								name: "domain",
								description: t("controller.generatePlanet.domainDescription"),
								type: "text",
								placeholder: "Domain name",
								defaultValue: "",
							},
							{
								name: "comment",
								description: t("controller.generatePlanet.commentDescription"),
								type: "text",
								placeholder: "comment",
								value: "",
							},
							{
								name: "Identity",
								description: t("controller.generatePlanet.identityDescription"),
								type: "text",
								placeholder: "identity",
								value: getWorld?.identity,
							},
							{
								name: "endpoints",
								type: "text",
								description: t(
									"controller.generatePlanet.endpointsDescription",
								),
								placeholder: "IP Address",
								value: `${getWorld?.ip}/9993`,
							},
						]}
						submitHandler={(params) =>
							new Promise((resolve) => {
								makeWorld(params);
								resolve(true);
							})
						}
					/>
				)}
			</div>
		</div>
	);
};

export default PrivateRoot;
