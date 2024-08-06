import { ReactElement } from "react";
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
import { useTrpcApiErrorHandler } from "~/hooks/useTrpcApiHandler";
import MenuSectionDividerWrapper from "~/components/shared/menuSectionDividerWrapper";

const OrganizationSettings = ({ user }) => {
	const router = useRouter();
	const organizationId = router.query.orgid as string;

	const t = useTranslations();
	const handleApiError = useTrpcApiErrorHandler();

	const callModal = useModalStore((state) => state.callModal);
	const closeModal = useModalStore((state) => state.closeModal);

	const { refetch: refecthAllOrg } = api.org.getAllOrg.useQuery(null, {
		enabled: user?.role === "ADMIN",
	});

	const { mutate: leaveOrg } = api.org.leave.useMutation({
		onError: handleApiError,
	});

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
		<main className="flex w-full flex-col justify-center space-y-5 bg-base-100 p-5 sm:p-3 xl:w-6/12">
			<HeadSection title={pageTitle} />
			<MenuSectionDividerWrapper title={t("commonMenuTiles.organizationSettings")}>
				{user?.role === "ADMIN" ? (
					<div className="space-y-5 pb-[10%]">
						<InputField
							label={t("admin.organization.listOrganization.organizationName")}
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
							label={t("admin.organization.listOrganization.description")}
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
				) : null}
			</MenuSectionDividerWrapper>
			<div>
				<div className="pb-10 border-t border-b border-red-600/25 rounded-md p-2">
					<p className="text-sm text-error uppercase">danger zone</p>
					<div className="divider mt-0 p-0 text-error"></div>

					<div className="space-y-5">
						<p className="text-sm text-gray-500">
							Leaving this organization will remove you from all networks and
							organizations associated with it. This cannot be undone.
						</p>
						<button
							onClick={() =>
								callModal({
									title: <p>{t("organization.leaveOrganization.confirmationTitle")}</p>,
									content: (
										<div>
											<p>{t("organization.leaveOrganization.confirmationMessage")}</p>
											<p className="mt-2 text-sm text-gray-500">
												{t("organization.leaveOrganization.note")}
											</p>
										</div>
									),
									yesAction: () => {
										return leaveOrg(
											{ organizationId, userId: user.id },
											{
												onSuccess: () => {
													router.push("/network");
												},
											},
										);
									},
								})
							}
							className="btn btn-sm btn-error btn-outline font-semibold py-2 px-4 rounded-lg flex items-center"
						>
							{t("commonButtons.leaveOrganization")}
						</button>
					</div>
				</div>
			</div>
		</main>
	);
};

OrganizationSettings.getLayout = function getLayout(page: ReactElement) {
	return (
		<LayoutOrganizationAuthenticated props={page?.props}>
			{page}
		</LayoutOrganizationAuthenticated>
	);
};

export { getServerSideProps };

export default OrganizationSettings;
