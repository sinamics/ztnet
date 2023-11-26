import React from "react";
import InputFields from "~/components/elements/inputField";
import { ErrorData } from "~/types/errorHandling";
import { api } from "~/utils/api";
import toast from "react-hot-toast";
// import { useTranslations } from "next-intl";

const AddOrgForm = () => {
	// const t = useTranslations("admin");
	const { refetch } = api.org.getAllOrg.useQuery();

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
			toast.success("Group added successfully");
			refetch();
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
				rootClassName="w-full"
				rootFormClassName=""
				fields={[
					{
						name: "orgName",
						type: "text",
						placeholder: "Organization Name",
						description: "Name of the organization",
						defaultValue: "",
					},
					{
						name: "orgDescription",
						type: "text",
						elementType: "textarea",
						placeholder: "Organization Description",
						description: "Organization Description",
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
