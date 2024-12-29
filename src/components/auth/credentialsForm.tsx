import { signIn, useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { ErrorCode } from "~/utils/errorCode";
import Link from "next/link";
import TOTPInput from "./totpInput";
import FormSubmitButtons from "./formSubmitButton";
import FormInput from "./formInput";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

interface FormData {
	email: string;
	password: string;
	totpCode?: string;
}

const CredentialsForm: React.FC = () => {
	const router = useRouter();
	const t = useTranslations();
	const session = useSession();
	const [totpCode, setTotpCode] = useState("");
	const [showOTP, setShowOTP] = useState<boolean>(false);
	const [loading, setLoading] = useState({ credentials: false, oauth: false });
	const [formData, setFormData] = useState<FormData>({
		email: "",
		password: "",
	});

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = event.target;
		setFormData((prevFormData) => ({
			...prevFormData,
			[name]: value,
		}));
	};

	const submitHandler = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setLoading((prev) => ({ ...prev, credentials: true }));

		try {
			const response = await signIn("credentials", {
				redirect: false,
				totpCode,
				userAgent: navigator.userAgent,
				...formData,
			});

			if (response.ok) {
				await router.push("/network");
				return;
			}

			switch (response?.error) {
				case ErrorCode.SecondFactorRequired:
					setShowOTP(true);
					break;
				default:
					toast.error(response.error, { duration: 10000 });
			}
		} catch (error) {
			toast.error(error.message);
		} finally {
			setLoading((prev) => ({ ...prev, credentials: false }));
		}
	};

	return (
		<form className="space-y-4" onSubmit={submitHandler}>
			{!showOTP && (
				<>
					<Link
						href={session?.data ? "/api/auth/signout" : "/api/auth/signin"}
						className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
					>
						{session?.data ? "Sign out" : "Sign in"}
					</Link>
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
					<div className="flex items-center justify-between">
						<div className="text-sm">
							<Link
								href="/auth/forgotPassword"
								className="cursor-pointer text-blue-500  hover:text-blue-700"
							>
								{t("authPages.form.forgotPassword")}
							</Link>
						</div>
					</div>
				</>
			)}
			{showOTP && <TOTPInput totpCode={totpCode} setTotpCode={setTotpCode} />}
			<div className="pt-5">
				<FormSubmitButtons
					loading={loading.credentials}
					title={showOTP ? t("authPages.form.verify2FA") : t("authPages.form.signIn")}
				/>
			</div>
		</form>
	);
};

export default CredentialsForm;
