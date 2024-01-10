import { RootNodes } from "@prisma/client";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Input from "~/components/elements/input";
import { ErrorData } from "~/types/errorHandling";
import { api } from "~/utils/api";
import { useModalStore } from "~/utils/store";

const RootNodesArray = ({ rootNodes, handleEndpointArrayChange }) => {
	const t = useTranslations("admin");

	const [config, setConfig] = useState([{ endpoint: "", identity: "", comment: "" }]);

	useEffect(() => {
		if (!rootNodes[0].identity) return;
		setConfig([
			{
				endpoint: rootNodes[0].endpoints,
				identity: rootNodes[0].identity,
				comment: rootNodes[0].comment || "",
			},
		]);
	}, [rootNodes]);

	const handleRemoveClick = (index) => {
		const list = [...config];
		list.splice(index, 1);
		setConfig(list);
	};
	return (
		<div className="space-y-10">
			{config.map((cfg, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
				<div key={i} className="p-5 border rounded-md border-primary">
					<p>Root #{i + 1}</p>
					<div>
						<label className="block text-gray-500 mb-2">
							{t("controller.generatePlanet.endpointsDescription")}
						</label>
						<Input
							name="endpoint"
							type="text"
							placeholder="Endpoint"
							value={cfg.endpoint}
							onChange={(e) => handleEndpointArrayChange(e, i)}
							className="input-bordered input-sm px-3 py-2 w-full rounded-md border-gray-300"
						/>
					</div>
					<div>
						<label className="block text-gray-500 mb-2">Identity</label>
						<Input
							name="identity"
							type="text"
							placeholder="Identity"
							value={cfg.identity}
							onChange={(e) => handleEndpointArrayChange(e, i)}
							className="px-3 py-2 w-full input-sm rounded-md border-gray-300"
						/>
					</div>
					<div>
						<label className="block text-gray-500 mb-2">Comment Description</label>
						<Input
							name="comment"
							type="text"
							placeholder="Comment"
							value={cfg.comment}
							onChange={(e) => handleEndpointArrayChange(e, i)}
							className="px-3 py-2 w-full input-sm rounded-md border-gray-300"
						/>
					</div>
					{i > 0 && i === config.length - 1 ? (
						<div className="pt-7">
							<button
								onClick={() => handleRemoveClick(i)}
								className="btn btn-sm btn-outline"
							>
								Remove
							</button>
						</div>
					) : null}
				</div>
			))}
			<div>
				<p className="font-medium">Add Root Server</p>
				<p className="text-sm text-gray-500">
					Expand your network by adding an additional root server. Click here to register
					a new server to your system.
				</p>
				{/* <button onClick={handleAddClick} className="btn btn-sm btn-outline">
					+
				</button> */}
			</div>
		</div>
	);
};

const RootForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const t = useTranslations("admin");
	const { callModal } = useModalStore((state) => state);
	const { data: getPlanet, refetch: refetchOptions } = api.admin.getPlanet.useQuery();

	const { data: getIdentity } = api.admin.getIdentity.useQuery();

	const [world, setWorld] = useState({
		plRecommend: true,
		plBirth: Date.now(),
		plID: Math.floor(Math.random() * 2 ** 32),
		rootNodes: [
			{
				plEndpoints: "",
				plComment: "",
				plIdentity: "",
			},
		] as RootNodes[],
	});

	useEffect(() => {
		setWorld((prev) => {
			// Use existing data from getOptions.rootNodes if available
			const rootNodesData =
				getPlanet?.rootNodes.length > 0
					? getPlanet.rootNodes
					: [
							{
								endpoints: `${getIdentity?.ip}/9993`,
								identity: getIdentity?.identity,
								comment: "",
							},
					  ];

			return {
				...prev, // Spread the previous state
				plRecommend:
					getPlanet?.plRecommend !== undefined
						? getPlanet?.plRecommend
						: prev.plRecommend,
				plBirth: Number(getPlanet?.plBirth) || prev.plBirth,
				plID: Number(getPlanet?.plID) || prev.plID,
				rootNodes: rootNodesData, // Set the rootNodes
			};
		});
	}, [getPlanet, getIdentity]);

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
							{t.rich("controller.generatePlanet.modal.restartContainerInstructions", {
								span: (content) => <span className="text-yellow-300">{content} </span>,
								br: () => <br />,
							})}
						</p>
					</span>
				),
			});
		},
		onError: (error) => {
			if ((error.data as ErrorData)?.zodError) {
				const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
				for (const field in fieldErrors) {
					toast.error(`${fieldErrors[field].join(", ")}`);
				}
			} else if (error.message) {
				toast.error(error.message);
			} else {
				toast.error("An unknown error occurred");
			}
		},
	});

	const inputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

	const handleEndpointArrayChange = (e, index) => {
		const { name, value } = e.target;
		const list = [...config];
		list[index][name] = value;
		setConfig(list);
	};

	// const handleAddClick = (e) => {
	// 	e.preventDefault();
	// 	setConfig([...config, { endpoint: "", identity: "", comment: "" }]);
	// };

	return (
		<>
			{/* Display list of root nodes */}
			<form className="pt-6 rounded-md space-y-4">
				{!getPlanet?.id ? (
					<div className="flex flex-col space-y-2">
						<span className="label-text">
							{t("controller.generatePlanet.plRecommend")} (plRecommend)
						</span>
						<input
							name="plRecommend"
							disabled={!getPlanet?.id}
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
							disabled={world.plRecommend && !!getPlanet?.id}
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
							disabled={world.plRecommend && !!getPlanet?.id}
						/>
					</div>
				</div>

				<RootNodesArray
					rootNodes={world.rootNodes}
					handleEndpointArrayChange={handleEndpointArrayChange}
				/>

				<div className="pt-10">
					<button
						onClick={(e) => {
							e.preventDefault();
							// makeWorld(world, {
							// 	onSuccess: () => {
							// 		refetchOptions();

							// 		if (onClose) onClose();
							// 	},
							// });
						}}
						className={"btn btn-primary btn-sm"}
						type="submit"
					>
						{!getPlanet?.id
							? t("controller.generatePlanet.buttons.updateWorld")
							: t("controller.generatePlanet.buttons.createPlanet")}
					</button>
				</div>
			</form>
		</>
	);
};

export default RootForm;
