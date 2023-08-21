import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Input from "~/components/elements/input";
import { ErrorData } from "~/types/errorHandling";
import { api } from "~/utils/api";
import { useModalStore } from "~/utils/store";

const RootForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const t = useTranslations("admin");
	const { callModal } = useModalStore((state) => state);
	const { data: getOptions, refetch: refetchOptions } =
		api.settings.getAllOptions.useQuery();
	const { data: getIdentity } = api.admin.getIdentity.useQuery();

	const [world, setWorld] = useState({
		plRecommend: true,
		plBirth: Date.now(),
		plID: Math.floor(Math.random() * 2 ** 32),
		endpoints: "",
		comment: "",
		identity: "",
	});

	const { mutate: makeWorld } = api.admin.makeWorld.useMutation({
		onSuccess: () => {
			// refetchOptions();
			callModal({
				title: <p>{t("controller.generatePlanet.modal.noteTitle")}</p>,
				rootStyle: "text-left border border-yellow-300/30",
				yesAction: null,
				content: (
					<span>
						{t("controller.generatePlanet.modal.customPlanetGenerated")}
						<br />
						<p>
							{t.rich(
								"controller.generatePlanet.modal.restartContainerInstructions",
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
		onError: (error) => {
			if ((error.data as ErrorData)?.zodError) {
				const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
				for (const field in fieldErrors) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-call
					toast.error(`${fieldErrors[field].join(", ")}`);
				}
			} else if (error.message) {
				toast.error(error.message);
			} else {
				toast.error("An unknown error occurred");
			}
		},
	});
	useEffect(() => {
		if (getOptions) {
			setWorld((prev) => ({
				plRecommend: getOptions?.plRecommend || prev.plRecommend,
				plBirth: Number(getOptions?.plBirth) || prev.plBirth,
				plID: Number(getOptions?.plID) || prev.plID,
				endpoints: getOptions?.plEndpoints || `${getIdentity?.ip}/9993`,
				comment: getOptions?.plComment,
				identity: getOptions?.plIdentity || getIdentity?.identity,
			}));
		}
	}, [getOptions, getIdentity]);

	const inputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const target = e.target as HTMLInputElement;
		let value;

		switch (target.type) {
			case "checkbox":
				value = target.checked;
				break;
			case "number":
				value = parseInt(target.value, 10);
				break;
			default:
				value = target.value;
		}

		setWorld({
			...world,
			[e.target.name]: value,
		});
	};

	return (
		<>
			{/* Display list of root nodes */}
			<form className="pt-6 rounded-md space-y-4">
				{!getOptions?.customPlanetUsed ? (
					<div className="flex flex-col space-y-2">
						<span className="label-text">
							{t("controller.generatePlanet.plRecommend")}
						</span>
						<input
							name="plRecommend"
							type="checkbox"
							checked={world.plRecommend}
							className="checkbox checkbox-primary checkbox-sm"
							onChange={inputChange}
						/>
					</div>
				) : null}
				<div className="flex justify-between gap-5">
					<div className="w-full">
						<label className="block text-gray-500 mb-2">
							{t("controller.generatePlanet.birthLabel")}
						</label>
						<Input
							name="plBirth"
							type="number"
							placeholder={t("controller.generatePlanet.birthLabel")}
							value={world.plBirth}
							onChange={inputChange}
							className="input-bordered input-sm px-3 py-2 w-full rounded-md border-gray-300"
							disabled={world.plRecommend && !getOptions?.customPlanetUsed}
						/>
					</div>

					<div className="w-full">
						<label className="block text-gray-500 mb-2">
							{t("controller.generatePlanet.idLabel")}
						</label>
						<Input
							name="plID"
							type="number"
							placeholder={t("controller.generatePlanet.idPlaceholder")}
							value={world.plID}
							onChange={inputChange}
							className="input-bordered input-sm px-3 w-full py-2 rounded-md border-gray-300"
							disabled={world.plRecommend && !getOptions?.customPlanetUsed}
						/>
					</div>
				</div>
				<div>
					<label className="block text-gray-500 mb-2">
						{t("controller.generatePlanet.endpointsDescription")}
					</label>
					<Input
						name="endpoints"
						type="text"
						placeholder={t("controller.generatePlanet.endpointsPlaceholder")}
						value={world?.endpoints}
						onChange={inputChange}
						className="input-bordered input-sm px-3 py-2 w-full rounded-md border-gray-300"
					/>
				</div>
				<div>
					<label className="block text-gray-500 mb-2">Idendity</label>
					<Input
						name="identity"
						type="text"
						placeholder={t("controller.generatePlanet.commentPlaceholder")}
						value={world?.identity}
						onChange={inputChange}
						className="px-3 py-2 w-full input-sm rounded-md border-gray-300"
					/>
				</div>
				<div>
					<label className="block text-gray-500 mb-2">
						{t("controller.generatePlanet.commentDescription")}
					</label>
					<Input
						name="comment"
						type="text"
						placeholder={t("controller.generatePlanet.commentPlaceholder")}
						value={world?.comment}
						onChange={inputChange}
						className="px-3 py-2 w-full input-sm rounded-md border-gray-300"
					/>
				</div>
				<button
					onClick={(e) => {
						e.preventDefault();
						if (world.endpoints && !world.endpoints.includes("9993")) {
							return callModal({
								title: <p>Port Notification</p>,
								rootStyle: "text-left border border-yellow-300/30",
								showButtons: true,
								content: (
									<>
										<span className="space-y-3">
											As you are using a custom port, you must also be aware
											that
											<span className="bg-gray-600">
												/var/lib/zerotier-one/local.conf
											</span>
											must be updated to reflect the new port.
										</span>
										<pre className="text-secondary bg-base-200 p-4 rounded">
											{JSON.stringify(
												{
													settings: {
														primaryPort: "your port",
														//.....
													},
												},
												null,
												2,
											)}
										</pre>

										<div className="pt-10">
											Do you want to continue with your current config?
										</div>
									</>
								),
								yesAction: () => {
									return makeWorld(world, {
										onSuccess: () => {
											refetchOptions();

											if (onClose) onClose();
										},
									});
								},
							});
						}

						makeWorld(world, {
							onSuccess: () => {
								refetchOptions();

								if (onClose) onClose();
							},
						});
					}}
					className={"btn btn-primary btn-sm"}
					type="submit"
				>
					{getOptions?.customPlanetUsed
						? t("controller.generatePlanet.buttons.updateWorld")
						: t("controller.generatePlanet.buttons.createPlanet")}
				</button>
			</form>
		</>
	);
};

export default RootForm;
