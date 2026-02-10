import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";
import { api } from "~/utils/api";
import { useTrpcApiErrorHandler } from "~/hooks/useTrpcApiHandler";
import FormInput from "./formInput";
import FormSubmitButtons from "./formSubmitButton";
import { useTranslations } from "next-intl";
interface FormData {
	email: string;
	password: string;
	name: string;
	ztnetInvitationCode?: string;
	token: string;
}

const RegisterForm: React.FC = () => {
	const t = useTranslations();
	const router = useRouter();
	const { invite } = router.query as { invite?: string };

	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState<FormData>({
		email: "",
		password: "",
		name: "",
		ztnetInvitationCode: "",
		token: invite,
	});
	const handleApiError = useTrpcApiErrorHandler();
	const { mutate: register } = api.auth.register.useMutation();

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = event.target;

		setFormData((prevFormData) => ({
			...prevFormData,
			[name]: value,
		}));
	};

	const submitHandler = (event: React.FormEvent<HTMLFormElement>) => {
		setLoading(true);
		event.preventDefault();
		register(formData, {
			onSuccess: () =>
				void (async () => {
					const result = await signIn("credentials", {
						redirect: false,
						userAgent: navigator.userAgent,
						...formData,
					});
					setLoading(false);

					if (!result.error) {
						await router.push("/network");
					}
				})(),
			onError: (error) => {
				setLoading(false);
				handleApiError(error);
			},
		});
	};
	return (
		<form className="space-y-5" onSubmit={submitHandler}>
			{invite && (
				<FormInput
					label={t("authPages.form.invitationCode")}
					name="ztnetInvitationCode"
					type="text"
					value={formData.ztnetInvitationCode}
					onChange={handleChange}
					placeholder={t("authPages.form.invitationCodePlaceholder")}
				/>
			)}
			<FormInput
				label={t("authPages.form.name")}
				name="name"
				type="text"
				value={formData.name}
				onChange={handleChange}
				placeholder={t("authPages.form.namePlaceholder")}
				icon={
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 16 16"
						fill="currentColor"
						className="h-4 w-4 opacity-70"
					>
						<path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
					</svg>
				}
			/>
			<FormInput
				label={t("authPages.form.email")}
				name="email"
				type="email"
				value={formData.email}
				onChange={handleChange}
				placeholder={t("authPages.form.emailPlaceholder")}
				icon={
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 16 16"
						fill="currentColor"
						className="h-4 w-4 opacity-70"
					>
						<path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z" />
						<path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z" />
					</svg>
				}
			/>
			<FormInput
				label={t("authPages.form.password")}
				name="password"
				type="password"
				value={formData.password}
				onChange={handleChange}
				placeholder={t("authPages.form.passwordPlaceholder")}
				icon={
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 16 16"
						fill="currentColor"
						className="h-4 w-4 opacity-70"
					>
						<path
							fillRule="evenodd"
							d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
							clipRule="evenodd"
						/>
					</svg>
				}
			/>
			<div className="pt-5">
				<FormSubmitButtons loading={loading} title={t("authPages.form.signUp")} />
			</div>
		</form>
	);
};

export default RegisterForm;
