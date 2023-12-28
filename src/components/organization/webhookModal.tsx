import React, { useEffect, useState } from "react";
import { api } from "~/utils/api";
import toast from "react-hot-toast";
import { useModalStore } from "~/utils/store";
import { useTranslations } from "next-intl";
import Input from "../elements/input";
import MultiSelectDropdown from "../elements/multiSelect";
import { Webhook } from "@prisma/client";
import { HookType } from "~/types/webhooks";

interface Iprops {
	organizationId: string;
	hook: Webhook;
}

const OrganizationWebhook = ({ organizationId, hook }: Iprops) => {
	const b = useTranslations("commonButtons");
	// const t = useTranslations("admin");
	const [input, setInput] = useState({
		webhookId: "",
		webhookUrl: "",
		webhookDescription: "",
		webhookName: "",
		hookType: [],
	});

	const { closeModal } = useModalStore((state) => state);
	const { refetch: refecthAllOrg } = api.org.getAllOrg.useQuery();

	const { mutate: addWebhook } = api.org.addOrgWebhooks.useMutation();

	useEffect(() => {
		if (!hook) return;
		setInput({
			webhookId: hook.id,
			webhookUrl: hook.url,
			webhookName: hook.name,
			webhookDescription: "",
			hookType: hook.eventTypes as string[],
		});
	}, [hook]);

	const inputHandler = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		setInput({
			...input,
			[e.target.name]: e.target.value,
		});
	};

	const selectHandler = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		setInput({
			...input,
			hookType: e as string[],
		});
	};

	const submitHandler = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		e.preventDefault();
		try {
			addWebhook(
				{
					organizationId: organizationId,
					webhookUrl: input.webhookUrl,
					webhookName: input.webhookName,
					hookType: input.hookType,
					webhookId: input.webhookId,
				},
				{
					onSuccess: () => {
						toast.success("Webhook added successfully");
						closeModal();
						refecthAllOrg();
					},
					onError: () => {
						toast.error("Error adding webhook");
					},
				},
			);

			refecthAllOrg();
		} catch (_err) {
			toast.error("Error adding webhook");
		}
	};
	return (
		<form className="space-y-5 w-full">
			<div className="form-control">
				<h1 className="text-md font-medium tracking-wide">Webhook Name</h1>
				<label className="text-sm text-gray-500">
					This field is for entering the name of the webhook. The name is used to identify
					the webhook and should be descriptive enough to distinguish it from other
					webhooks.
				</label>
				<Input
					type="text"
					placeholder="Name"
					value={input?.webhookName}
					onChange={inputHandler}
					name="webhookName"
					className="input-bordered input-sm w-full"
				/>
			</div>
			<div className="dropdown dropdown-end z-50">
				<h1 className="text-md font-medium tracking-wide">Select webhook actions</h1>
				<label className="text-sm text-gray-500">
					This dropdown menu allows you to choose the specific actions your webhook should
					perform. Each option represents a different type of action.
				</label>
				<div>
					<MultiSelectDropdown
						formFieldName={"hookType"}
						options={Object.keys(HookType)}
						value={input?.hookType}
						// name="hookType"
						onChange={selectHandler}
						prompt="Select Webhook Actions"
					/>
				</div>
			</div>
			<div className="form-control">
				<h1 className="text-md font-medium tracking-wide">Webhook URL</h1>
				<label className="text-sm text-gray-500">
					This field is for entering the URL where the webhook will send data. It must be
					a valid and accessible URL endpoint that can receive and process incoming
					webhook data.
				</label>
				<Input
					type="text"
					placeholder="URL"
					value={input?.webhookUrl}
					onChange={inputHandler}
					name="webhookUrl"
					className="input-bordered input-sm w-full"
				/>
			</div>

			<div className="pt-10">
				<button onClick={submitHandler} type="submit" className="btn btn-sm">
					{b("submit")}
				</button>
			</div>
		</form>
	);
};

export default OrganizationWebhook;
