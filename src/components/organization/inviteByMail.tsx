import InputField from "~/components/elements/inputField";
import { api } from "~/utils/api";
import { UserRolesList } from "~/utils/role";

interface Iprops {
	organizationId: string;
}

const InviteByMail = ({ organizationId }: Iprops) => {
	const { mutate: generateInviteLink } = api.org.generateInviteLink.useMutation();

	return (
		<div>
			<p className="text-xl upp">Invite by mail</p>
			<p className="text-sm text-gray-400 ">
				Invited users who are not currently members of the application will need to
				register through the provided link in the invitation email. Token is valid for 1
				hour.
			</p>
			<InputField
				isLoading={false}
				label=""
				openByDefault={true}
				showCancelButton={false}
				showSubmitButtons={true}
				rootFormClassName="space-y-3 pt-2 "
				rootClassName="flex flex-col space-y-10"
				labelClassName="text-gray-600"
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
						placeholder: "Email Address",
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
