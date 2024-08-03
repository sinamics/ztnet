import { useTranslations } from "next-intl";
import InputField from "~/components/elements/inputField";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";
import { api } from "~/utils/api";
import { UserRolesList } from "~/utils/role";

interface Iprops {
	organizationId: string;
}

const InviteByMail = ({ organizationId }: Iprops) => {
	const t = useTranslations("organization");
	const m = useTranslations("commonToast");

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const { refetch: refetchInvites } = api.org.getInvites.useQuery({
		organizationId,
	});

	const { mutate: inviteUserByMail, isLoading: inviteLoading } =
		api.org.inviteUserByMail.useMutation({
			onError: handleApiError,
			onSuccess: handleApiSuccess({
				actions: [refetchInvites],
				toastMessage: m("sentSuccessfully"),
			}),
		});

	return (
		<div>
			<p className="font-medium">{t("invitation.inviteByEmail.title")}</p>
			<p className="text-sm text-gray-500">{t("invitation.inviteByEmail.description")}</p>
			<InputField
				isLoading={inviteLoading}
				label=""
				openByDefault={true}
				showCancelButton={false}
				showSubmitButtons={true}
				rootFormClassName="space-y-3 pt-2 "
				rootClassName="flex flex-col space-y-10"
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
						description: t("invitation.inviteByEmail.emailDescription"),
						placeholder: t("invitation.inviteByEmail.emailPlaceholder"),
						// value: options?.smtpPort,
					},
					{
						name: "role",
						elementType: "select",
						placeholder: "user role",
						description: t("invitation.inviteByEmail.selectRoleDescription"),
						initialValue: "READ_ONLY",
						selectOptions: UserRolesList,
					},
				]}
				submitHandler={(params) => {
					return new Promise(() => {
						return inviteUserByMail({
							...params,
							email: (params.email as string)?.trim(),
						});
					});
				}}
			/>
		</div>
	);
};

export default InviteByMail;
