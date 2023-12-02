import React from "react";
import InputFields from "~/components/elements/inputField";
import { ErrorData } from "~/types/errorHandling";
import { api } from "~/utils/api";
import toast from "react-hot-toast";
// import { useTranslations } from "next-intl";

const AddOrgForm = () => {
	// const t = useTranslations("admin");
	const { refetch: refecthOrg } = api.org.getAllOrg.useQuery();
	const { refetch: refetchMe } = api.auth.me.useQuery();
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
		},
	});
	// console.log(userOrgs);
	return (
		<div className="space-y-10">
			<InputFields
				isLoading={false}
				label="Add Organization"
				size="sm"
				buttonText="Create"
				description="Create a new organization"
				rootClassName="w-full"
				rootFormClassName=""
				fields={[
					{
						name: "orgName",
						type: "text",
						placeholder: "",
						description: "Name of the organization",
						defaultValue: "",
					},
					{
						name: "orgDescription",
						type: "text",
						elementType: "textarea",
						placeholder: "",
						description: "Organization Description (Optional)",
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
