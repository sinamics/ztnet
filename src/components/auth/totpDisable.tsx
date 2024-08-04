import { useState } from "react";
import toast from "react-hot-toast";
import { ErrorCode } from "~/utils/errorCode";
import { useModalStore } from "~/utils/store";

const DisableTwoFactSetupModal = () => {
	const { closeModal } = useModalStore((state) => state);
	const [totpCode, setTotpCode] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleDisable() {
		if (isSubmitting) {
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch("/api/auth/two-factor/totp/disable", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					totpCode,
				}),
			});
			const body = await response.json();

			if (body.error === ErrorCode.IncorrectTwoFactorCode) {
				toast.error("Incorrect code. Please try again");
			} else if (body.error) {
				toast.error("Sorry something went wrong");
			} else {
				toast.success("Successfully disabled 2FA");
			}

			closeModal();
		} catch (error) {
			toast.error("Sorry something went wrong");
			console.error(error);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form className="space-y-10">
			<h3 className="mb-2">Disable two-factor authentication</h3>
			<p>Enter your code to disable 2FA</p>
			<input
				type="password"
				value={totpCode}
				onChange={(e) => setTotpCode(e.target.value)}
				className="input input-sm mt-2 rounded border p-2"
				placeholder="Enter your password"
			/>
			<button
				onClick={handleDisable}
				disabled={isSubmitting}
				type="submit"
				className="btn btn-sm ml-2 rounded px-4 py-2 btn-primary"
			>
				{isSubmitting ? "Working..." : "Disable"}
			</button>
		</form>
	);
};

export default DisableTwoFactSetupModal;
