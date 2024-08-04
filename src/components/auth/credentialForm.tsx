import React from "react";
import Link from "next/link";
import OAuthLoginButton from "./oauthLoginButtons";
import SubmitButtons from "./submitButtons";
import TOTPInput from "./totpInput";
import FormInput from "./formInput";

export interface FormData {
	email: string;
	password: string;
	totpCode?: string;
}

export interface LoadingState {
	credentials: boolean;
	oauth: boolean;
}

interface CredentialsFormProps {
	formData: FormData;
	handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
	submitHandler: (event: React.FormEvent<HTMLFormElement>) => void;
	loading: LoadingState;
	showOTP: boolean;
	totpCode: string;
	setTotpCode: (code: string) => void;
	hasOauth: boolean;
	oAuthHandler: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

const CredentialsForm: React.FC<CredentialsFormProps> = ({
	formData,
	handleChange,
	submitHandler,
	loading,
	showOTP,
	totpCode,
	setTotpCode,
	hasOauth,
	oAuthHandler,
}) => (
	<>
		<form className="space-y-4" onSubmit={submitHandler}>
			{!showOTP && (
				<>
					<FormInput
						label="Email"
						name="email"
						type="email"
						value={formData.email}
						onChange={handleChange}
						placeholder="mail@example.com"
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
						label="Password"
						name="password"
						type="password"
						value={formData.password}
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
					<div className="flex items-center justify-between">
						<div className="text-sm">
							<Link
								href="/auth/forgotPassword"
								className="cursor-pointer text-gray-400 hover:text-base-200"
							>
								Forgot your password?
							</Link>
						</div>
					</div>
				</>
			)}
			{showOTP && <TOTPInput totpCode={totpCode} setTotpCode={setTotpCode} />}
			<div className="pt-5">
				<SubmitButtons loading={loading.credentials} isTotp={showOTP} />
			</div>
		</form>
		{hasOauth && !showOTP && (
			<>
				<div className="flex flex-col w-full">
					<div className="divider divider-error">OR</div>
				</div>
				<div className="pt-5">
					<OAuthLoginButton oAuthHandler={oAuthHandler} loading={loading.oauth} />
				</div>
			</>
		)}
	</>
);

export default CredentialsForm;
