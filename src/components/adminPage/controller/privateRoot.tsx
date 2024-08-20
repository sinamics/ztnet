import { useTranslations } from "next-intl";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { api } from "~/utils/api";
import { useModalStore } from "~/utils/store";
import RootForm from "./rootForm";
import Link from "next/link";
import CreatePlanet from "./createPlanet";

const PrivateRoot = () => {
	const t = useTranslations("admin");
	const [open, setOpen] = useState(false);
	const callModal = useModalStore((state) => state.callModal);
	const { data: getPlanet, refetch: refetchPlanet } = api.admin.getPlanet.useQuery();

	const closeForm = () => setOpen(false);
	const { mutate: resetWorld } = api.admin.resetWorld.useMutation({
		onSuccess: () => {
			refetchPlanet();
			toast.success("Planet file has been restored!");
		},
	});
	async function downloadPlanet() {
		try {
			const response = await fetch("/api/mkworld/config");
			if (!response.ok) {
				throw new Error("Network response was not ok");
			}
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.style.display = "none";
			a.href = url;
			a.download = "ztnet-world.zip";
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
		} catch (error) {
			console.error("There was an error downloading the file:", error);
		}
	}
	const handleFileChange = (event) => {
		const file = event.target.files[0];
		if (file) {
			// Handle file upload here. For example, send it to your server.
			uploadFile(file);
		}
	};

	const triggerFileInput = () => {
		const fileInput = document.getElementById("fileInput");
		fileInput.click();
	};

	const uploadFile = (file) => {
		// This is just a basic example. Adjust it to your needs.
		const formData = new FormData();
		formData.append("file", file);

		fetch("/api/mkworld/config", {
			method: "POST",
			body: formData,
		})
			.then((response) => {
				if (!response.ok) {
					// Convert non-2xx HTTP responses into errors
					return response.json().then((data) => {
						throw new Error(data.error || "Unknown error");
					});
				}
				return response.json();
			})
			.then(() => {
				refetchPlanet();
				callModal({
					title: <p>{t("controller.generatePlanet.modal.noteTitle")}</p>,
					rootStyle: "text-left border border-yellow-300/30",
					showButtons: true,
					closeModalOnSubmit: true,
					content: (
						<span>
							{t("controller.generatePlanet.modal.customPlanetGenerated")}
							<br />
							<p>
								{t.rich("controller.generatePlanet.modal.restartContainerInstructions", {
									span: (content) => <span className="text-yellow-300">{content} </span>,
									br: () => <br />,
								})}
							</p>
						</span>
					),
				});
			})
			.catch((error) => {
				console.error("Error uploading the file:", error);
				// Display the error message to the user using toast or another method
				toast.error(error.message);
			});
	};
	return (
		<div className="space-y-4">
			<div>
				<p className="text-sm text-gray-500">
					{t("controller.generatePlanet.updatePlanetWarning")}
				</p>
				{getPlanet?.rootNodes?.length > 0 ? (
					<>
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
							<div className="space-y-5">
								{getPlanet?.rootNodes?.map((node, i) => (
									<div
										key={node.id}
										className="border border-primary rounded p-4 my-4 space-y-5"
									>
										{!node.endpoints.toString().includes("9993") ? (
											<div role="alert" className="alert shadow-lg mb-5">
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
												<div>
													<h3 className="font-bold">
														{t("controller.generatePlanet.customPortIsInUse")}
													</h3>
													<div className="text-xs">
														{t.rich(
															"controller.generatePlanet.customPortIsInUseDescription",
															{
																kbd: (content) => (
																	<kbd className="kbd kbd-xs">{content}</kbd>
																),
															},
														)}
													</div>
												</div>
											</div>
										) : null}
										<section>
											<p className="tracking-wide font-medium">Root #{i + 1}</p>
											<p>
												<strong>Comments:</strong> {node.comments}
											</p>
											<p>
												<strong>Endpoints:</strong> {node.endpoints.toString()}
											</p>
											<p>
												<strong>Identity:</strong> {node.identity.substring(0, 50)}
											</p>
											<p>
												<strong>WorldType:</strong> {node.isMoon ? "Moon" : "Planet"}
											</p>
										</section>
										<section>
											{node.isMoon ? (
												<span className="text-sm flex gap-1">
													<p>Moon file is available for download at the following URL:</p>
													<Link href="/api/moon" className="link text-blue-500">
														api/moon
													</Link>
												</span>
											) : (
												<span className="text-sm flex gap-1">
													{/* {t("controller.generatePlanet.downloadPlanetInfo")} */}
													<p>
														Planet file is available for download at the following URL:
													</p>
													<Link href="/api/planet" className="link text-blue-500">
														{t("controller.generatePlanet.downloadPlanetUrl")}
													</Link>
												</span>
											)}
										</section>
									</div>
								))}
							</div>
							<div className="flex justify-between">
								<div className="flex gap-3">
									<button
										onClick={() => downloadPlanet()}
										className="btn join-item bg-primary btn-sm"
									>
										{t("controller.generatePlanet.buttons.downloadPlanetButton")}
									</button>
									<button onClick={() => setOpen(!open)} className="btn join-item btn-sm">
										{t("controller.generatePlanet.buttons.editPlanetConfig")}
									</button>
								</div>

								<button
									onClick={() =>
										callModal({
											title: t(
												"controller.generatePlanet.modal.restoreOriginalPlanetTitle",
											),
											content: t(
												"controller.generatePlanet.modal.restoreOriginalPlanetContent",
											),
											yesAction: () => {
												resetWorld();
												setOpen(false);
											},
										})
									}
									className="btn btn-outline btn-error btn-sm"
								>
									{t("controller.generatePlanet.buttons.restoreOriginalPlanetButton")}
								</button>
							</div>
							{open ? <RootForm onClose={closeForm} /> : null}
						</div>
					</>
				) : (
					<CreatePlanet
						getPlanet={getPlanet}
						resetWorld={resetWorld}
						open={open}
						setOpen={setOpen}
						handleFileChange={handleFileChange}
						triggerFileInput={triggerFileInput}
						closeForm={closeForm}
					/>
				)}
			</div>
		</div>
	);
};

export default PrivateRoot;
