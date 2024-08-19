import { useState } from "react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { Session } from "next-auth";
import { toast } from "react-hot-toast";
import { type ErrorData, type ZodErrorFieldErrors } from "~/types/errorHandling";
import Head from "next/head";
import { globalSiteTitle } from "~/utils/global";
import FormInput from "~/components/auth/formInput";
import FormSubmitButtons from "~/components/auth/formSubmitButton";
import { ErrorCode } from "~/utils/errorCode";
import { useTranslations } from "next-intl";
import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { getSession } from "next-auth/react";

const MfaRecoveryReset = () => {
	const t = useTranslations();
	const router = useRouter();
	const { token } = router.query;
	const [state, setState] = useState({ email: "", password: "", recoveryCode: "" });
	const { mutate: resetMfa, isLoading } = api.mfaAuth.mfaResetValidation.useMutation();

	const { data: tokenData, isLoading: validateTokenLoading } =
		api.mfaAuth.mfaValidateToken.useQuery(
			{
				token: token as string,
			},
			{
				enabled: !!token,
				onSuccess: (response) => {
					if (response?.error) {
						switch (response.error) {
							case ErrorCode.InvalidToken:
								void router.push("/auth/login");
								break;
							case ErrorCode.TooManyRequests:
								toast.error("Too many requests, please try again later");
								break;
							default:
								toast.error(response.error);
						}
					}
				},
				onError: (error) => {
					toast.error(error.message);
				},
			},
		);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		resetMfa(
			{
				...state,
				token: token as string,
			},
			{
				onSuccess: () => {
					toast.success("Password reset successfully");
					void router.push("/");
				},
				onError: (error) => {
					if ((error.data as ErrorData)?.zodError) {
						const fieldErrors: ZodErrorFieldErrors = (error.data as ErrorData)?.zodError
							.fieldErrors;

						for (const field in fieldErrors) {
							if (Array.isArray(fieldErrors[field])) {
								// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-call
								toast.error(`${fieldErrors[field].join(", ")}`, {
									duration: 10000,
								});
							}
						}
					} else if (error.message) {
						toast.error(error.message);
					} else {
						toast.error("An unknown error occurred");
					}
				},
			},
		);
	};
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		// handle the form change here
		setState({ ...state, [e.target.name]: e.target.value });
	};

	const title = `${globalSiteTitle} - Reset MFA`;
	if (validateTokenLoading || !tokenData) {
		return null;
	}
	return (
		<div>
			<Head>
				<title>{title}</title>
				<link rel="icon" href="/favicon.ico" />
				<meta name="robots" content="noindex, nofollow" />
			</Head>
			<div className="z-10 flex h-screen w-screen items-center justify-center">
				<div className="w-100 mx-auto rounded-2xl border border-1 border-primary p-12">
					<div className="mb-4">
						<h3 className="text-2xl font-semibold">
							{t("authPages.mfaRecoveryReset.mfaRecoveryResetTitle")}
						</h3>
						<p className="text-gray-500">
							{t("authPages.mfaRecoveryReset.mfaRecoveryResetMessage")}
						</p>
					</div>
					<form className="space-y-5" onSubmit={handleSubmit}>
						<FormInput
							label={t("authPages.form.email")}
							name="email"
							type="email"
							value={state.email}
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
							value={state.password}
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
						<FormInput
							label={t("authPages.form.mfaRecoveryCode")}
							name="recoveryCode"
							type="text"
							value={state.recoveryCode}
							onChange={handleChange}
							placeholder={t("authPages.form.mfaRecoveryCodePlaceholder")}
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
							<FormSubmitButtons loading={isLoading} title={t("commonButtons.submit")} />
						</div>
					</form>
					<div className="pt-5 text-center text-xs text-gray-400">
						<span>Copyright © {new Date().getFullYear()} Kodea Solutions</span>
					</div>
				</div>
			</div>
		</div>
	);
};

interface Props {
	auth?: Session["user"];
}
export const getServerSideProps: GetServerSideProps<Props> = async (
	context: GetServerSidePropsContext,
) => {
	const session = await getSession(context);
	if (!session || !("user" in session) || !session.user) {
		return {
			props: {
				messages: (await import(`~/locales/${context.locale}/common.json`)).default,
			},
		};
	}

	if (session.user) {
		return {
			redirect: {
				destination: "/network",
				permanent: false,
			},
		};
	}

	return {
		props: { auth: session.user },
	};
};

export default MfaRecoveryReset;
