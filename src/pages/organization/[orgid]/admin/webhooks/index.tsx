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
import MenuSectionDividerWrapper from "~/components/shared/menuSectionDividerWrapper";

const ListWebHooks = ({ organizationId }) => {
	const t = useTranslations();

	const { data: orgData, refetch: refecthOrgById } = api.org.getOrgById.useQuery({
		organizationId,
	});

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const { mutate: deleteWebhook } = api.org.deleteOrgWebhooks.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({
			actions: [refecthOrgById],
			toastMessage: t("commonToast.deletedSuccessfully"),
		}),
	});

	return (
		<div>
			<MenuSectionDividerWrapper title={t("commonMenuTiles.activeWebhooks")}>
				{orgData?.webhooks?.map((hook: Webhook) => (
					<div
						key={hook.id}
						className="mb-4 p-6 last:mb-0 border border-gray-300 rounded-lg shadow-lg transition-shadow duration-200 ease-in-out dark:border-gray-700 bg-white dark:bg-gray-800 "
					>
						<div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
							{hook.name}
						</div>
						<div className="text-sm text-gray-600 dark:text-gray-400 flex justify-between">
							<span>{t("organization.webhook.listWebhooks.description")}:</span>
							<span className="font-medium">{hook.description}</span>
						</div>
						<div className="text-sm text-gray-600 dark:text-gray-400 flex justify-between">
							<span>{t("organization.webhook.listWebhooks.url")}:</span>
							<span className="font-medium">{hook.url}</span>
						</div>
						<div className="text-sm text-gray-600 dark:text-gray-400 flex justify-between">
							<span>{t("organization.webhook.listWebhooks.lastDelivery")}:</span>
							<span className="font-medium">
								<TimeAgo date={hook.lastDelivery} />
							</span>
						</div>
						<div className="text-sm text-gray-600 dark:text-gray-400">
							<div>{t("organization.webhook.listWebhooks.events")}:</div>
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
								{t("commonButtons.delete")}
							</button>
						</div>
					</div>
				))}
			</MenuSectionDividerWrapper>
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
	const t = useTranslations();
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
			toastMessage: t("commonToast.addedSuccessfully"),
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
		<main className="flex w-full flex-col justify-center bg-base-100 p-5 sm:p-3">
			<HeadSection title={pageTitle} />

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
				<form className="space-y-5 w-full">
					<MenuSectionDividerWrapper
						title={t("commonMenuTiles.webhooks")}
						className="space-y-10"
					>
						<h1 className="text-sm text-gray-500">
							{t.rich("organization.webhook.description", {
								br: () => <br />,
							})}
						</h1>
						<div className="form-control">
							<h1 className="text-md font-medium tracking-wide">
								{t("organization.webhook.createWebhook.webhookName")}
							</h1>
							<label className="text-sm text-gray-500">
								{t("organization.webhook.createWebhook.webhookNameDescription")}
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
								{t("organization.webhook.createWebhook.selectWebhookActions")}
							</h1>
							<label className="text-sm text-gray-500">
								{t("organization.webhook.createWebhook.selectWebhookActionsDescription")}
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
								{t("organization.webhook.createWebhook.webhookUrl")}
							</h1>
							<label className="text-sm text-gray-500">
								{t("organization.webhook.createWebhook.webhookUrlDescription")}
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
								{t("commonButtons.submit")}
							</button>
						</div>
					</MenuSectionDividerWrapper>
				</form>
				<div className="space-y-2">
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
