import React, { ReactElement } from "react";
import { api } from "~/utils/api";
import toast from "react-hot-toast";
import { useModalStore } from "~/utils/store";
import { useTranslations } from "next-intl";
import { ErrorData } from "~/types/errorHandling";
import { useRouter } from "next/router";
import { LayoutOrganizationAuthenticated } from "~/components/layouts/layout";
import { getServerSideProps } from "~/server/getServerSideProps";
import HeadSection from "~/components/shared/metaTags";
import { globalSiteTitle } from "~/utils/global";
import InputField from "~/components/elements/inputField";

const OrganizationSettings = () => {
	const router = useRouter();
	const organizationId = router.query.orgid as string;

	const b = useTranslations("commonButtons");
	const t = useTranslations("admin");

	const { closeModal } = useModalStore((state) => state);
	const { refetch: refecthAllOrg } = api.org.getAllOrg.useQuery();

	const { data: orgData, refetch: refecthOrgById } = api.org.getOrgById.useQuery(
		{
			organizationId,
		},
		{
			enabled: !!organizationId,
		},
	);
	const { mutate: updateOrg, isLoading: loadingUpdate } = api.org.updateMeta.useMutation({
		onSuccess: () => {
			toast.success("Organization updated successfully");
			refecthAllOrg();
			refecthOrgById();
			closeModal();
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

	const pageTitle = `${globalSiteTitle} - Meta`;
	return (
		<main className="flex w-full flex-col justify-center space-y-10 bg-base-100 p-3 sm:w-6/12">
			<div>
				<p className="text-[0.7rem] text-gray-400 uppercase">Organization Settings</p>
				<div className="divider mt-0 p-0 text-gray-500" />
			</div>
			<div className="space-y-5">
				<InputField
					label={t("organization.listOrganization.organizationName")}
					// isLoading={loadingUpdate}
					rootFormClassName="space-y-3 pt-2 w-3/6"
					size="sm"
					fields={[
						{
							name: "orgName",
							type: "text",
							placeholder: orgData?.orgName,
							value: orgData?.orgName,
						},
					]}
					submitHandler={async (params) => {
						return new Promise((resolve, reject) =>
							updateOrg(
								{
									organizationId,
									...params,
								},
								{
									onSuccess: () => {
										resolve(true);
									},
									onError: (error) => {
										reject(error);
									},
								},
							),
						);
					}}
				/>
				<InputField
					label={t("organization.listOrganization.description")}
					isLoading={loadingUpdate}
					rootFormClassName="space-y-3 pt-2 w-5/6"
					size="sm"
					fields={[
						{
							name: "orgDescription",
							type: "text",
							elementType: "textarea",
							placeholder: orgData?.description,
							value: orgData?.description,
						},
					]}
					submitHandler={async (params) => {
						return new Promise((resolve, reject) =>
							updateOrg(
								{
									organizationId,
									...params,
								},
								{
									onSuccess: () => {
										resolve(true);
									},
									onError: (error) => {
										reject(error);
									},
								},
							),
						);
					}}
				/>
			</div>
			<HeadSection title={pageTitle} />
		</main>
	);
};

OrganizationSettings.getLayout = function getLayout(page: ReactElement) {
	return <LayoutOrganizationAuthenticated>{page}</LayoutOrganizationAuthenticated>;
};

export { getServerSideProps };

export default OrganizationSettings;
