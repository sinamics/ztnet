import classNames from "classnames";
import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { ErrorCode } from "~/utils/errorCode";
import { useModalStore } from "~/utils/store";
import TwoFactAuthDigits from "./totpDigits";
import { api } from "~/utils/api";

enum SetupStep {
	ConfirmPassword = 0,
	DisplayQrCode = 1,
	EnterTotpCode = 2,
}

const WithStep = ({
	step,
	current,
	children,
}: { step: SetupStep; current: SetupStep; children: JSX.Element }) => {
	return step === current ? children : null;
};

const ShowSteps = ({ step }: { step: number }) => [
	<ul className="steps w-full">
		<li
			data-content={`${step > 0 ? "✓" : "?"}`}
			className={classNames("step step-neutral", {
				"step-success": step > 0,
				"step-primary": step === 0,
			})}
		>
			Password
		</li>
		<li
			data-content={`${step > 1 ? "✓" : "?"}`}
			className={classNames("step step-neutral", {
				"step-success": step > 1,
				"step-primary": step === 1,
			})}
		>
			Scan Code
		</li>
		<li
			data-content={`${step > 2 ? "✓" : "?"}`}
			className={classNames("step step-neutral", {
				"step-success": step > 2,
				"step-primary": step === 2,
			})}
		>
			Sumbit
		</li>
	</ul>,
];

const TOTPSetup: React.FC = () => {
	const { closeModal } = useModalStore((state) => state);
	const [dataUri, setDataUri] = useState("");
	const [totpCode, setTotpCode] = useState<string>("");
	const [password, setPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [step, setStep] = useState(SetupStep.ConfirmPassword);
	const { refetch: refetchMe } = api.auth.me.useQuery();

	async function handleSetup() {
		setIsSubmitting(true);
		try {
			const response = await fetch("/api/auth/two-factor/totp/setup", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					password,
				}),
			});
			const body = await response.json();
			if (response.status === 200) {
				setDataUri(body.dataUri);
				setStep(SetupStep.DisplayQrCode);
				return;
			}

			if (body.error === ErrorCode.IncorrectPassword) {
				toast.error("Incorrect Password");
			} else if (body.error) {
				toast.error("Sorry something went wrong");
			}
		} catch (error) {
			toast.error("Sorry something went wrong");
			console.error(error);
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleEnable(totpCode: string) {
		setIsSubmitting(true);

		try {
			const response = await fetch("/api/auth/two-factor/totp/enable", {
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
				toast.success("Successfully enabled 2FA");
				refetchMe();
				closeModal();
			}
		} catch (error) {
			toast.error("Sorry something went wrong");
			console.error(error);
		} finally {
			setIsSubmitting(false);
		}
	}
	return (
		<div>
			<ShowSteps step={step} />
			<WithStep step={SetupStep.ConfirmPassword} current={step}>
				<div className="space-y-10">
					<h3 className="mb-2 text-lg">Confirm your password</h3>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="input-bordered input-sm mt-2 rounded border p-2"
						placeholder="Enter your password"
					/>
					<button
						onClick={handleSetup}
						disabled={isSubmitting}
						type="submit"
						className="btn btn-sm ml-2 rounded px-4 py-2 btn-primary"
					>
						{isSubmitting ? "Checking..." : "Confirm Password"}
					</button>
				</div>
			</WithStep>
			<WithStep step={SetupStep.DisplayQrCode} current={step}>
				<div className="mt-4 space-y-5">
					<h3 className="mb-2">Scan this QR code with your authenticator app</h3>
					{/* <QRCode value={dataUri} size={256} /> */}
					<img src={dataUri} alt="totp" width={100} />
					{/* <p className="mt-2">
						If you can't scan the QR code, enter this secret manually:{" "}
						<strong>{secret}</strong>
					</p> */}
					<button
						onClick={() => setStep(SetupStep.EnterTotpCode)}
						className="btn btn-sm ml-2 rounded px-4 py-2 btn-primary"
					>
						Next
					</button>
				</div>
			</WithStep>
			<WithStep step={SetupStep.EnterTotpCode} current={step}>
				{/* <form className="mt-4"> */}
				<div>
					<h3 className="mb-2">Verify your TOTP setup</h3>
					<p>Enter the code from your authenticator app to verify and enable TOTP.</p>
					<TwoFactAuthDigits
						value={totpCode}
						onChange={setTotpCode}
						onValidationChange={(isValid) => {
							// Handle validation state change
							// biome-ignore lint/suspicious/noConsoleLog: <explanation>
							console.log("Is input valid:", isValid);
						}}
					/>
					<button
						onClick={() => handleEnable(totpCode)}
						disabled={isSubmitting}
						className="btn btn-sm ml-2 rounded px-4 py-2 btn-primary"
					>
						{isSubmitting ? "Verifying..." : "Verify and Enable"}
					</button>
				</div>
				{/* </form> */}
			</WithStep>
		</div>
	);
};

export default TOTPSetup;
