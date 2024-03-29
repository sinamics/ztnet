import React, { ReactElement, useState } from "react";
import { api } from "~/utils/api";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { Webhook } from "@prisma/client";
import { HookType } from "~/types/webhooks";
import Input from "~/components/elements/input";
import MultiSelectDropdown from "~/components/elements/multiSelect";
import { LayoutOrganizationAuthenticated } from "~/components/layouts/layout";
import { getServerSideProps } from "~/server/getServerSideProps";
import { useRouter } from "next/router";
import TimeAgo from "react-timeago";
import HeadSection from "~/components/shared/metaTags";
import { globalSiteTitle } from "~/utils/global";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";

const ListWebHooks = ({ organizationId }) => {
	const b = useTranslations("commonButtons");
	const m = useTranslations("commonToast");

	const { data: orgData, refetch: refecthOrgById } = api.org.getOrgById.useQuery({
		organizationId,
	});

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const { mutate: deleteWebhook } = api.org.deleteOrgWebhooks.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({
			actions: [refecthOrgById],
			toastMessage: m("deletedSuccessfully"),
		}),
	});

	return (
		<div className="cursor-pointer">
			{orgData?.webhooks?.map((hook: Webhook) => (
				<div
					key={hook.id}
					className="mb-4 p-6 last:mb-0 border border-gray-300 rounded-lg shadow-lg transition-shadow duration-200 ease-in-out dark:border-gray-700 bg-white dark:bg-gray-800 "
				>
					<div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
						{hook.name}
					</div>
					<div className="text-sm text-gray-600 dark:text-gray-400 flex justify-between">
						<span>Description:</span>
						<span className="font-medium">{hook.description}</span>
					</div>
					<div className="text-sm text-gray-600 dark:text-gray-400 flex justify-between">
						<span>URL:</span>
						<span className="font-medium">{hook.url}</span>
					</div>
					<div className="text-sm text-gray-600 dark:text-gray-400 flex justify-between">
						<span>Last Delivery:</span>
						<span className="font-medium">
							<TimeAgo date={hook.lastDelivery} />
						</span>
					</div>
					<div className="text-sm text-gray-600 dark:text-gray-400">
						<div>Events:</div>
						<div className="font-medium">
							{(hook.eventTypes as string[])?.join(" - ")}
						</div>
					</div>
					<div className="flex justify-end">
						<button
							onClick={() =>
								deleteWebhook({
									organizationId: hook.organizationId,
									webhookId: hook.id,
								})
							}
							type="submit"
							className="btn btn-sm btn-error btn-outline"
						>
							{b("delete")}
						</button>
					</div>
				</div>
			))}
		</div>
	);
};

const initialState = {
	webhookId: "",
	webhookUrl: "",
	webhookDescription: "",
	webhookName: "",
	hookType: [],
};
const OrganizationWebhook = () => {
	const b = useTranslations("commonButtons");
	const m = useTranslations("commonToast");
	const t = useTranslations("admin");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const router = useRouter();
	const organizationId = router.query.orgid as string;

	const [input, setInput] = useState(initialState);

	// TODO make only one request instead of Orgbyid and AllOrgs
	const { refetch: refecthOrg } = api.org.getOrgById.useQuery({
		organizationId,
	});

	const { mutate: addWebhook } = api.org.addOrgWebhooks.useMutation({
		onSuccess: handleApiSuccess({
			actions: [refecthOrg],
			toastMessage: m("addedSuccessfully"),
		}),
		onError: handleApiError,
	});

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
						setInput(initialState);
					},
				},
			);
		} catch (_err) {
			toast.error("Error adding webhook");
		}
	};

	const pageTitle = `${globalSiteTitle} - Webhooks`;

	return (
		<main className="space-y-10 w-full bg-base-200 p-5 rounded-lg ">
			<HeadSection title={pageTitle} />
			<div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
				<div className="xl:col-span-2">
					<h1 className="text-2xl font-bold">Organization Webhooks</h1>
					<h1 className="text-md">
						Empower your organization with our webhook integration, offering real-time
						notifications for critical events.
						<br />
						Stay ahead with instant updates, directly piped into your system, ensuring
						seamless workflow and immediate response capabilities.
					</h1>
				</div>
				<form className="space-y-10 w-full">
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
						<button
							onClick={submitHandler}
							type="submit"
							className="btn btn-sm btn-primary"
						>
							{b("submit")}
						</button>
					</div>
				</form>
				<div className="space-y-2">
					<div className="text-md font-medium tracking-wide">Active Hooks:</div>

					<ListWebHooks organizationId={organizationId} />
				</div>
			</div>
		</main>
	);
};

OrganizationWebhook.getLayout = function getLayout(page: ReactElement) {
	return <LayoutOrganizationAuthenticated>{page}</LayoutOrganizationAuthenticated>;
};

export { getServerSideProps };

export default OrganizationWebhook;
