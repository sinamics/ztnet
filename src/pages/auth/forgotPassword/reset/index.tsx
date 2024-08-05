import { useState } from "react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import { type ErrorData, type ZodErrorFieldErrors } from "~/types/errorHandling";
import Head from "next/head";
import { globalSiteTitle } from "~/utils/global";

const ForgotPassword = () => {
	const router = useRouter();
	const { token } = router.query;
	const [state, setState] = useState({ password: "", newPassword: "" });

	const { mutate: resetPassword } = api.auth.changePasswordFromJwt.useMutation();
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

	const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
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
					<form className="space-y-5">
						<div className="space-y-2">
							<label className="text-sm font-medium tracking-wide">Password</label>
							<input
								className="input w-full rounded-lg border border-gray-300 px-4  py-2 text-base focus:border-primary/25 focus:outline-none"
								value={state.password}
								onChange={handleChange}
								type="password"
								name="password"
								placeholder="Enter your new password"
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium tracking-wide">
								Confirm New Password
							</label>
							<input
								className="input w-full rounded-lg border border-gray-300 px-4  py-2 text-base focus:border-primary/25 focus:outline-none"
								value={state.newPassword}
								onChange={handleChange}
								type="password"
								name="newPassword"
								placeholder="Confirm your new password"
							/>
						</div>
						<div className="pt-5">
							<button
								type="submit"
								onClick={handleSubmit}
								className="btn btn-block btn-primary cursor-pointer rounded-full p-3 font-semibold tracking-wide shadow-lg"
							>
								Reset Password
							</button>
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
