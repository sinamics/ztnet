import { useState } from "react";
import toast from "react-hot-toast";
import { ErrorCode } from "~/utils/errorCode";
import { useModalStore } from "~/utils/store";
import TwoFactAuth from "./totpDigits";
import { api } from "~/utils/api";

const DisableTwoFactSetupModal = () => {
	const closeModal = useModalStore((state) => state.closeModal);
	const [totpCode, setTotpCode] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { refetch: refetchMe } = api.auth.me.useQuery();

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

			refetchMe();
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
			<p className="text-sm ">
				Enter your current 2FA code to confirm and disable Multifactor Authentication
			</p>
			<TwoFactAuth value={totpCode} onChange={(val) => setTotpCode(val)} />
			<div className="flex justify-end">
				<button
					onClick={handleDisable}
					disabled={isSubmitting}
					type="submit"
					className="btn btn-sm ml-2 rounded-sm px-4 py-2 btn-primary"
				>
					{isSubmitting ? "Working..." : "Disable"}
				</button>
			</div>
		</form>
	);
};

export default DisableTwoFactSetupModal;
