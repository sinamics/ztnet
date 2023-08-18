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

	const [world, setWorld] = useState({
		plRecommend: true,
		plBirth: Date.now(),
		plID: Math.floor(Math.random() * 2 ** 32),
		endpoints: "",
		comment: "",
	});

	const { mutate: makeWorld } = api.admin.makeWorld.useMutation({
		onSuccess: () => {
			// refetchOptions();
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
				endpoints: getOptions?.plEndpoints,
				comment: getOptions?.plComment,
			}));
		}
	}, [getOptions]);

	const inputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const target = e.target as HTMLInputElement;
		const value = target.type === "checkbox" ? target.checked : target.value;

		setWorld({
			...world,
			[e.target.name]: value,
		});
	};
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		// Handle the form submission here.
	};

	return (
		<>
			{/* Display list of root nodes */}
			<form onSubmit={handleSubmit} className="pt-6 rounded-md space-y-4">
				{!getOptions?.customPlanetUsed ? (
					<div className="flex flex-col space-y-2">
						<span className="label-text">Auto-Generate IDs</span>
						<input
							name="plRecommend"
							type="checkbox"
							checked={world.plRecommend}
							className="checkbox checkbox-primary"
							onChange={inputChange}
						/>
					</div>
				) : null}
				<div className="flex justify-between gap-5">
					<div className="w-full">
						<label className="block text-gray-500 mb-2">Birth (plBirth)</label>
						<Input
							name="plBirth"
							type="number"
							placeholder="Enter Birth"
							value={world.plBirth}
							onChange={inputChange}
							className="input-bordered input-md px-3 py-2 w-full rounded-md border-gray-300"
							disabled={world.plRecommend && !getOptions?.customPlanetUsed}
						/>
					</div>

					<div className="w-full">
						<label className="block text-gray-500 mb-2">ID (plID)</label>
						<Input
							name="plID"
							type="number"
							placeholder="Enter ID"
							value={world.plID}
							onChange={inputChange}
							className="input-bordered input-md px-3 w-full py-2 rounded-md border-gray-300"
							disabled={world.plRecommend && !getOptions?.customPlanetUsed}
						/>
					</div>
				</div>
				<div>
					<label className="block text-gray-500 mb-2">Endpoints</label>
					<Input
						name="endpoints"
						type="text"
						placeholder="Enter Domain"
						value={world?.endpoints}
						onChange={inputChange}
						className="input-bordered input-md px-3 py-2 w-full rounded-md border-gray-300"
					/>
				</div>

				<div>
					<label className="block text-gray-500 mb-2">Comment</label>
					<Input
						name="comment"
						type="text"
						placeholder="Enter Comment"
						value={world?.comment}
						onChange={inputChange}
						className="px-3 py-2 w-full rounded-md border-gray-300"
					/>
				</div>
				<button
					onClick={() =>
						makeWorld(world, {
							onSuccess: () => {
								refetchOptions();

								if (onClose) onClose();
							},
						})
					}
					className={"btn btn-primary btn-md"}
					type="submit"
				>
					{getOptions?.customPlanetUsed ? "Update World" : "Create World"}
				</button>
			</form>
		</>
	);
};

export default RootForm;
