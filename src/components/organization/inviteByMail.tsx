import { useTranslations } from "next-intl";
import InputField from "~/components/elements/inputField";
import { api } from "~/utils/api";
import { UserRolesList } from "~/utils/role";

interface Iprops {
	organizationId: string;
}

const InviteByMail = ({ organizationId }: Iprops) => {
	const t = useTranslations("admin");

	const { mutate: generateInviteLink } = api.org.generateInviteLink.useMutation();

	return (
		<div>
			<label className="label">
				<span className="label-text">
					Invited users who are not currently members of the application will need to
					register through the provided link in the invitation email. Token is valid for 1
					hour.
				</span>
			</label>
			<InputField
				isLoading={false}
				label=""
				openByDefault={true}
				showCancelButton={false}
				showSubmitButtons={true}
				rootFormClassName="space-y-3 pt-2"
				rootClassName="flex flex-col space-y-3"
				buttonClassName="btn-block"
				size="sm"
				fields={[
					{
						name: "organizationId",
						type: "hidden",
						value: organizationId,
					},
					{
						name: "email",
						type: "text",
						description: "Enter the mail address of the user you want to invite",
						placeholder: "email address",
						// value: options?.smtpPort,
					},
					{
						name: "role",
						elementType: "select",
						placeholder: "user role",
						description: "Select the role of the user",
						selectOptions: UserRolesList,
					},
				]}
				submitHandler={(params) => {
					return new Promise((resolve, reject) => {
						generateInviteLink(
							{ ...params },
							{
								onSuccess: (data) => {
									resolve(data);
								},
								onError: (error) => {
									reject(error);
								},
							},
						);
					});
				}}
			/>
		</div>
	);
};

export default InviteByMail;
