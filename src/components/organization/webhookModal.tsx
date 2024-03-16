import React, { useEffect, useState } from "react";
import { api } from "~/utils/api";
import toast from "react-hot-toast";
import { useModalStore } from "~/utils/store";
import { useTranslations } from "next-intl";
import Input from "../elements/input";
import MultiSelectDropdown from "../elements/multiSelect";
import { Webhook } from "@prisma/client";
import { HookType } from "~/types/webhooks";
import { handleErrors } from "~/utils/errors";

interface Iprops {
	organizationId: string;
	hook?: Webhook;
}

const OrganizationWebhook = ({ organizationId, hook }: Iprops) => {
	const b = useTranslations("commonButtons");
	const t = useTranslations("admin");
	const [input, setInput] = useState({
		webhookId: "",
		webhookUrl: "",
		webhookDescription: "",
		webhookName: "",
		hookType: [],
	});

	// TODO make only one request instead of Orgbyid and AllOrgs
	const { closeModal } = useModalStore((state) => state);
	// const { refetch: refecthAllOrg } = api.org.getAllOrg.useQuery();
	const { refetch: refecthOrg } = api.org.getOrgById.useQuery({
		organizationId,
	});

	const { mutate: addWebhook } = api.org.addOrgWebhooks.useMutation({
		onSuccess: () => {
			toast.success(`Webhook ${hook ? "updated" : "added"} successfully`);
			closeModal();
			refecthOrg();
			// refecthAllOrg();
		},
	});

	const { mutate: deleteWebhook } = api.org.deleteOrgWebhooks.useMutation({
		onSuccess: () => {
			toast.success("Webhook deleted successfully");
			closeModal();
			refecthOrg();
			// refecthAllOrg();
		},
	});

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

	const selectHandler = (e: string[]) => {
		setInput({
			...input,
			hookType: e,
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
						toast.success(`Webhook ${hook ? "updated" : "added"} successfully`);
						closeModal();
						refecthOrg();
						// refecthAllOrg();
					},
					onError: (error) => {
						handleErrors(error);
					},
				},
			);
		} catch (_err) {
			toast.error("Error adding webhook");
		}
	};
	const deleteHandler = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		e.preventDefault();
		try {
			deleteWebhook(
				{
					organizationId: organizationId,
					webhookId: input.webhookId,
				},
				{
					onSuccess: () => {
						closeModal();
						refecthOrg();
						// refecthAllOrg();
					},
					onError: (error) => {
						handleErrors(error);
					},
				},
			);
		} catch (_err) {
			toast.error("Error deleting webhook");
		}
	};
	return (
		<form className="space-y-5 w-full">
			<div className="form-control">
				<h1 className="text-md font-medium tracking-wide">
					{t("organization.listOrganization.webhookModal.webhookName")}
				</h1>
				<label className="text-sm text-gray-500">
					{t("organization.listOrganization.webhookModal.webhookNameDescription")}
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
				<h1 className="text-md font-medium tracking-wide">
					{t("organization.listOrganization.webhookModal.selectWebhookActions")}
				</h1>
				<label className="text-sm text-gray-500">
					{t(
						"organization.listOrganization.webhookModal.selectWebhookActionsDescription",
					)}
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
				<h1 className="text-md font-medium tracking-wide">
					{t("organization.listOrganization.webhookModal.webhookUrl")}
				</h1>
				<label className="text-sm text-gray-500">
					{t("organization.listOrganization.webhookModal.webhookUrlDescription")}
				</label>
				<Input
					type="text"
					placeholder="https://...."
					value={input?.webhookUrl}
					onChange={inputHandler}
					name="webhookUrl"
					className="input-bordered input-sm w-full"
				/>
			</div>

			<div className="pt-10 space-x-5 ">
				<button onClick={submitHandler} type="submit" className="btn btn-sm btn-primary">
					{hook ? b("update") : b("submit")}
				</button>
				{hook ? (
					<button
						onClick={deleteHandler}
						type="submit"
						className="btn btn-sm btn-error btn-outline"
					>
						{b("delete")}
					</button>
				) : null}
			</div>
		</form>
	);
};

export default OrganizationWebhook;
