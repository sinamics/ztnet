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
}

const LoginForm: React.FC<IProps> = ({ hasOauth }) => {
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
					return await router.push("/dashboard");
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
					return await router.push("/dashboard");
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
			<div className="w-100 mx-auto rounded-2xl border border-1 border-base-300 bg-base-200 dark:bg-gray-100 p-12">
				<div className="mb-4">
					<h3 className="text-2xl font-semibold text-gray-800">Sign In </h3>
					<p className="text-gray-500">Please sign in to your account.</p>
				</div>
				<form className="space-y-5" onSubmit={submitHandler}>
					<div className="space-y-2">
						<label className="text-sm font-medium tracking-wide text-gray-700">
							Email
						</label>
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
						<label className="mb-5 text-sm font-medium tracking-wide text-gray-700">
							Password
						</label>
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
					{hasOauth ? (
						<div>
							<button
								type="button"
								onClick={(e) => oAuthHandler(e)}
								className={cn(
									"btn btn-block btn-primary cursor-pointer rounded-full p-3 font-semibold tracking-wide shadow-lg",
								)}
							>
								{loading.oauth ? <span className="loading loading-spinner"></span> : null}
								oAuth
							</button>
						</div>
					) : null}
					<div>
						<button
							type="submit"
							className={cn(
								"btn btn-block cursor-pointer rounded-full p-3 font-semibold tracking-wide shadow-lg",
							)}
						>
							{loading.credentials ? (
								<span className="loading loading-spinner"></span>
							) : null}
							Sign in
						</button>
					</div>
				</form>
				<div className="pt-5 text-center text-xs text-gray-400">
					<span>Copyright © {new Date().getFullYear()} Kodea Solutions</span>
				</div>
			</div>
		</div>
	);
};

export default LoginForm;
