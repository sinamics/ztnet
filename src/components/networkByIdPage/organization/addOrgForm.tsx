import React from "react";
import InputFields from "~/components/elements/inputField";
import { ErrorData } from "~/types/errorHandling";
import { api } from "~/utils/api";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

const AddOrgForm = () => {
	const b = useTranslations("commonButtons");
	const t = useTranslations("admin");
	const { refetch: refecthOrg } = api.org.getAllOrg.useQuery();
	const { refetch: refetchMe } = api.auth.me.useQuery();
	const { refetch: refetchUserOrg } = api.org.getOrgIdbyUserid.useQuery();

	const { mutate: addOrg } = api.org.createOrg.useMutation({
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
		onSuccess: () => {
			toast.success("Organization added successfully");
			refetchMe();
			refecthOrg();
			// will load websocket in _app.tsx
			refetchUserOrg();
		},
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
