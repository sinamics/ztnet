import { useRouter } from "next/router";
import { type ChangeEvent, useState } from "react";
import { api } from "~/utils/api";
import { useTranslations } from "next-intl";
import {
	useTrpcApiErrorHandler,
	useTrpcApiSuccessHandler,
} from "~/hooks/useTrpcApiHandler";

type User = {
	email: string;
};
interface IProps {
	organizationId?: string;
}

export const InviteMemberByMail = ({ organizationId }: IProps) => {
	const t = useTranslations("networkById");
	const [user, setUser] = useState<User>({ email: "" });
	const { query } = useRouter();

	const handleApiError = useTrpcApiErrorHandler();
	const handleApiSuccess = useTrpcApiSuccessHandler();

	const { mutate: invite, isLoading: loadingInvite } =
		api.network.inviteUserByMail.useMutation({
			onError: handleApiError,
			onSuccess: handleApiSuccess({
				toastMessage: t("inviteMemberByMail.successMessage", {
					email: user.email,
				}),
			}),
		});

	const inputHandler = (event: ChangeEvent<HTMLInputElement>) => {
		setUser({
			...user,
			[event.target.name]: event.target.value,
		});
	};

	return (
		<form>
			<label className="label">
				<span className="label-text">{t("inviteMemberByMail.labelText")}</span>
			</label>
			<div className="join">
				<span className="join-item px-4 bg-base-200 items-center flex">
					{t("inviteMemberByMail.title")}
				</span>
				<input
					onChange={inputHandler}
					name="email"
					value={user.email}
					type="email"
					placeholder={t("inviteMemberByMail.placeholder")}
					className="input join-item input-bordered"
				/>
				<button
					className="btn btn-active join-item"
					type="submit"
					onClick={(e) => {
						e.preventDefault();
						invite(
							{
								email: user.email,
								nwid: query.id as string,
								organizationId,
							},
							{
								onSuccess: () => {
									setUser({ email: "" });
								},
							},
						);
					}}
				>
					{loadingInvite ? (
						<span className="loading loading-spinner"></span>
					) : (
						<>{t("inviteMemberByMail.buttonText")}</>
					)}
				</button>
			</div>
		</form>
	);
};
