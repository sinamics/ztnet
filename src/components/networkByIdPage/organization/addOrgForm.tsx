import React from "react";
import InputFields from "~/components/elements/inputField";
import { api } from "~/utils/api";
import { useTranslations } from "next-intl";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";

const AddOrgForm = () => {
	const b = useTranslations("commonButtons");
	const t = useTranslations("admin");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const { refetch: refecthOrg } = api.org.getAllOrg.useQuery();
	const { refetch: refetchMe } = api.auth.me.useQuery();
	const { refetch: refetchUserOrg } = api.org.getOrgIdbyUserid.useQuery();

	const { mutate: addOrg } = api.org.createOrg.useMutation({
		onError: handleApiError,
		onSuccess: handleApiSuccess({ actions: [refecthOrg, refetchMe, refetchUserOrg] }),
	});
	return (
		<div className="space-y-10">
			<InputFields
				isLoading={false}
				label={t("organization.addOrganization.inputFields.label")}
				size="sm"
				buttonText={b("create")}
				description={t("organization.addOrganization.inputFields.description")}
				rootClassName="w-full"
				rootFormClassName=""
				fields={[
					{
						name: "orgName",
						type: "text",
						placeholder: "",
						description: t(
							"organization.addOrganization.inputFields.organizationName.description",
						),
						defaultValue: "",
					},
					{
						name: "orgDescription",
						type: "text",
						elementType: "textarea",
						placeholder: "",
						description: t(
							"organization.addOrganization.inputFields.organizationDescription.description",
						),
						defaultValue: "",
					},
				]}
				submitHandler={(params) =>
					new Promise((resolve) => {
						void addOrg(
							{
								...params,
							},
							{
								onSuccess: () => {
									resolve(true);
								},
							},
						);
					})
				}
			/>
		</div>
	);
};

export default AddOrgForm;
