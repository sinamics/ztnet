import { useRouter } from "next/router";
import { type ChangeEvent, useState } from "react";
import toast from "react-hot-toast";
import { type ErrorData } from "~/types/errorHandling";
import { api } from "~/utils/api";
import { useTranslations } from "next-intl";

type User = {
	memberid: string;
};
interface IProp {
	central?: boolean;
	organizationId?: string;
}
export const AddMemberById = ({ central = false, organizationId }: IProp) => {
	const t = useTranslations("networkById");
	const [user, setUser] = useState<User>({ memberid: "" });
	const { query } = useRouter();

	const { refetch: refecthNetworkById } = api.network.getNetworkById.useQuery(
		{
			nwid: query.id as string,
			central,
		},
		{ enabled: !!query.id },
	);

	const { mutate: createUser } = api.networkMember.create.useMutation({
		onSuccess: () => refecthNetworkById(),
		onError: (error) => {
			if ((error.data as ErrorData)?.zodError) {
				const fieldErrors = (error.data as ErrorData)?.zodError.fieldErrors;
				for (const field in fieldErrors) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-template-expressions
					toast.error(`${fieldErrors[field].join(", ")}`);
				}
			} else if (error.message) {
				toast.error(error.message);
			} else {
				toast.error(t("addMemberById.error.unknown"));
			}
		},
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
				<span className="label-text">{t("addMemberById.labelText")}</span>
			</label>
			<div className="join">
				<span className="join-item px-4 bg-base-200 items-center flex">
					{t("addMemberById.memberIdInput")}
				</span>
				<input
					onChange={inputHandler}
					name="memberid"
					value={user.memberid}
					type="text"
					placeholder={t("addMemberById.placeholder")}
					className="input input-bordered join-item"
				/>
				<button
					type="submit"
					onClick={(e) => {
						e.preventDefault();
						createUser(
							{
								id: user.memberid,
								nwid: query.id as string,
								organizationId,
								central,
							},
							{ onSuccess: () => setUser({ memberid: "" }) },
						);
					}}
					className="btn btn-active join-item"
				>
					{t("addMemberById.submitButton")}
				</button>
			</div>
		</form>
	);
};
