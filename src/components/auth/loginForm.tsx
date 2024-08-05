import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { ErrorCode } from "~/utils/errorCode";
import OAuthLoginButton from "./oauthLoginButtons";
import CredentialsForm from "./credentialForm";

interface FormData {
	email: string;
	password: string;
	totpCode?: string;
}

interface IProps {
	hasOauth: boolean;
	oauthExlusiveLogin: boolean;
}

const LoginForm: React.FC<IProps> = ({ hasOauth, oauthExlusiveLogin }) => {
	const router = useRouter();
	const { error: oauthError } = router.query;
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

	const oAuthHandler = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		event.preventDefault();
		setLoading((prev) => ({ ...prev, oauth: true }));

		try {
			await signIn("oauth");
			if (!oauthError) {
				await router.push("/network");
			} else {
				toast.error(`Error occurred: ${oauthError}` as string, { duration: 10000 });
			}
		} catch (_error) {
			toast.error(`Error occurred: ${oauthError}` as string);
		} finally {
			setLoading((prev) => ({ ...prev, oauth: false }));
		}
	};

	return (
		<div className="z-10 flex justify-center self-center">
			<div className="w-100 mx-auto rounded-2xl border border-primary p-12">
				<div className="mb-4">
					<h3 className="text-xl font-semibold">Sign in to your account</h3>
					{/* <p className="text-gray-500">Sign in to your account.</p> */}
				</div>
				{oauthExlusiveLogin && hasOauth ? (
					<OAuthLoginButton oAuthHandler={oAuthHandler} loading={loading.oauth} />
				) : (
					<CredentialsForm
						formData={formData}
						handleChange={handleChange}
						submitHandler={submitHandler}
						loading={loading}
						showOTP={showOTP}
						totpCode={totpCode}
						setTotpCode={setTotpCode}
						hasOauth={hasOauth}
						oAuthHandler={oAuthHandler}
					/>
				)}
				<div className="pt-5 text-center text-xs text-gray-400">
					<span>Copyright © {new Date().getFullYear()} Kodea Solutions</span>
				</div>
			</div>
		</div>
	);
};

export default LoginForm;
