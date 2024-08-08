import { useState } from "react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import { type ErrorData, type ZodErrorFieldErrors } from "~/types/errorHandling";
import Head from "next/head";
import { globalSiteTitle } from "~/utils/global";
import FormInput from "~/components/auth/formInput";
import FormSubmitButtons from "~/components/auth/formSubmitButton";

const ForgotPassword = () => {
	const router = useRouter();
	const { token } = router.query;
	const [state, setState] = useState({ password: "", newPassword: "" });

	const { mutate: resetPassword, isLoading } =
		api.auth.changePasswordFromJwt.useMutation();
	const { data: tokenData, isLoading: validateTokenLoading } =
		api.auth.validateResetPasswordToken.useQuery(
			{
				token: token as string,
			},
			{
				onSuccess: (response) => {
					if (response?.error) {
						router.push("/auth/login");
					}
				},
				onError: () => {
					router.push("/auth/login");
				},
			},
		);

	const submitHandler = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		resetPassword(
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

	if (validateTokenLoading || !tokenData || tokenData.error) {
		return null;
	}
	const title = `${globalSiteTitle} - Reset Password`;
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
						<h3 className="text-2xl font-semibold">Reset Password</h3>
						<p className="text-gray-500">Please enter your new password</p>
					</div>
					<form className="space-y-5" onSubmit={submitHandler}>
						<FormInput
							label="Password"
							name="password"
							type="password"
							value={state.password}
							onChange={handleChange}
							placeholder="Enter your password"
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
							label="Password"
							name="newPassword"
							type="password"
							value={state.newPassword}
							onChange={handleChange}
							placeholder="Confirm your new password"
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
							<FormSubmitButtons loading={isLoading} title="Reset Password" />
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

export default ForgotPassword;
