import { useState } from "react";
import { api } from "~/utils/api";
import cn from "classnames";
import { toast } from "react-hot-toast";
import { useTrpcApiErrorHandler } from "~/hooks/useTrpcApiHandler";

interface FormData {
	email: string;
}

const ForgotPasswordForm: React.FC = () => {
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState<FormData>({
		email: "",
	});
	const handleApiError = useTrpcApiErrorHandler();

	const { mutate: resetPassword } = api.auth.passwordResetLink.useMutation();

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
		resetPassword(formData, {
			onSuccess: () => {
				setLoading(false);
				setFormData({ email: "" });
				toast.success("Password reset link sent to your email if the account exist!", {
					duration: 10000,
				});
			},
			onError: (error) => {
				setLoading(false);
				handleApiError(error);
			},
		});
	};
	return (
		<div className="z-10 flex justify-center self-center">
			<div className="w-100 mx-auto rounded-2xl border p-12">
				<div className="mb-4">
					<h3 className="text-2xl font-semibold">Forgot Password </h3>
					<p className="text-gray-500">
						We will send you a reset link if the email exist
					</p>
				</div>
				<form className="space-y-5" onSubmit={submitHandler}>
					<div className="space-y-2">
						<label className="text-sm font-medium tracking-wide">Email</label>
						<input
							className="input w-full rounded-lg border border-gray-300 px-4  py-2 text-base focus:border-primary/25 focus:outline-none"
							value={formData.email}
							onChange={handleChange}
							type="email"
							name="email"
							placeholder="mail@example.com"
						/>
					</div>
					<div className="pt-5">
						<button
							type="submit"
							className={cn(
								"btn btn-block btn-primary cursor-pointer rounded-full p-3 font-semibold tracking-wide shadow-lg",
							)}
						>
							{loading ? <span className="loading loading-spinner"></span> : null}
							Send Email
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

export default ForgotPasswordForm;
