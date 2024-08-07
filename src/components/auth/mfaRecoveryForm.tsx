import { useState } from "react";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import { useTrpcApiErrorHandler } from "~/hooks/useTrpcApiHandler";
import FormInput from "./formInput";
import FormSubmitButtons from "./formSubmitButton";

interface FormData {
	email: string;
}

const MfaRecoveryForm: React.FC = () => {
	const [loading, setLoading] = useState(false);

	const [formData, setFormData] = useState<FormData>({
		email: "",
	});
	const handleApiError = useTrpcApiErrorHandler();

	const { mutate: resetPassword } = api.mfaAuth.mfaResetLink.useMutation();
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
				toast.success("2FA reset procedure sent to your email if the account exist!", {
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
		<form className="space-y-5" onSubmit={submitHandler}>
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

			<div className="pt-5">
				<FormSubmitButtons loading={loading} title="Send Email" />
			</div>
		</form>
	);
};

export default MfaRecoveryForm;
