import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";
import cn from "classnames";
import { toast } from "react-hot-toast";
import Link from "next/link";

interface FormData {
	email: string;
	password: string;
}

type NextAuthError = {
	message: string;
	code?: string;
	statusCode?: number;
};

interface IProps {
	hasOauth: boolean;
	oauthExlusiveLogin: boolean;
}

const OauthLoginButton = ({ oAuthHandler, loading }) => (
	<button
		type="button"
		onClick={(e) => oAuthHandler(e)}
		className={cn(
			"btn btn-block btn-primary cursor-pointer rounded-full font-semibold tracking-wide shadow-lg",
		)}
	>
		{loading.oauth ? <span className="loading loading-spinner"></span> : null}
		Sign in with oAuth
	</button>
);

const CredentialsLogin = ({ loading }) => (
	<button
		type="submit"
		className={cn(
			"btn btn-block btn-primary border cursor-pointer rounded-full font-semibold tracking-wide shadow-lg",
		)}
	>
		{loading.credentials ? <span className="loading loading-spinner"></span> : null}
		Sign in
	</button>
);

// Credentials Login Form Component
const CredentialsLoginForm = ({
	formData,
	handleChange,
	submitHandler,
	loading,
	hasOauth,
}) => {
	return (
		<>
			<div className="mb-4">
				<h3 className="text-2xl font-semibold ">Sign In </h3>
				<p className="text-gray-500">Sign in to your account.</p>
			</div>
			<form className="space-y-2" onSubmit={submitHandler}>
				<div className="space-y-2">
					<label className="text-sm font-medium tracking-wide">Email</label>
					<input
						className=" w-full rounded-lg border border-gray-300 px-4  py-2 text-base focus:border-green-400 focus:outline-none"
						value={formData.email}
						onChange={handleChange}
						type="email"
						name="email"
						placeholder="mail@example.com"
					/>
				</div>
				<div className="space-y-2">
					<label className="mb-5 text-sm font-medium tracking-wide">Password</label>
					<input
						className="w-full content-center rounded-lg border border-gray-300 px-4  py-2 text-base focus:border-green-400 focus:outline-none"
						value={formData.password}
						onChange={handleChange}
						type="password"
						name="password"
						placeholder="Enter your password"
					/>
				</div>
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

				<div className="pt-5">
					<CredentialsLogin loading={loading} />
				</div>
			</form>
			{hasOauth ? (
				<div className="flex flex-col w-full">
					<div className="divider divider-error">OR</div>
				</div>
			) : null}
		</>
	);
};

const LoginForm: React.FC<IProps> = ({ hasOauth, oauthExlusiveLogin }) => {
	const router = useRouter();
	const { error: oauthError } = router.query;
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

	const submitHandler = (event: React.FormEvent<HTMLFormElement>) => {
		setLoading((prev) => ({ ...prev, credentials: true }));
		event.preventDefault();

		signIn("credentials", {
			redirect: false,
			...formData,
		})
			.then(async (result) => {
				if (!result.error) {
					return await router.push("/network");
				}

				toast.error(result.error, { duration: 10000 });
				setLoading((prev) => ({ ...prev, credentials: false }));
			})
			.catch((error: NextAuthError) => {
				// Handle any errors that might occur during the signIn process
				toast.error(error.message);
				setLoading((prev) => ({ ...prev, credentials: false }));
			});
	};
	const oAuthHandler = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		event.preventDefault();
		setLoading((prev) => ({ ...prev, oauth: true }));

		await signIn("oauth")
			.then(async () => {
				if (!oauthError) {
					return await router.push("/network");
				}
				toast.error(`Error occured: ${oauthError}` as string, { duration: 10000 });
				setLoading((prev) => ({ ...prev, oauth: false }));
			})
			.catch((_error: NextAuthError) => {
				// Handle any errors that might occur during the signIn process
				toast.error(`Error occured: ${oauthError}` as string);
				setLoading((prev) => ({ ...prev, oauth: false }));
			});
	};

	return (
		<div className="z-10 flex justify-center self-center">
			<div className="w-100 mx-auto rounded-2xl border p-12">
				{!oauthExlusiveLogin || !hasOauth ? (
					<CredentialsLoginForm
						formData={formData}
						handleChange={handleChange}
						submitHandler={submitHandler}
						loading={loading}
						hasOauth={hasOauth}
					/>
				) : null}

				{hasOauth ? (
					<div className="">
						<OauthLoginButton oAuthHandler={oAuthHandler} loading={loading} />
					</div>
				) : null}
				<div className="pt-5 text-center text-xs text-gray-400">
					<span>Copyright © {new Date().getFullYear()} Kodea Solutions</span>
				</div>
			</div>
		</div>
	);
};

export default LoginForm;
