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
	const closeModal = useModalStore((state) => state.closeModal);
	const [state, setState] = useState({
		secret: "",
		dataUri: "",
		password: "",
		totpCode: "",
	});
	const [totpCode, setTotpCode] = useState<string>("");
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
					password: state.password,
				}),
			});
			const body = await response.json();
			if (response.status === 200) {
				setState((prev) => ({ ...prev, secret: body.secret, dataUri: body.dataUri }));
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
		<div className="space-y-10">
			<ShowSteps step={step} />
			<WithStep step={SetupStep.ConfirmPassword} current={step}>
				<form className="">
					<p className="text-sm">Type in your password</p>
					<input
						type="password"
						value={state.password}
						onChange={(e) => setState({ ...state, password: e.target.value })}
						className="input input-bordered input-sm mt-2 rounded border p-2"
						placeholder="Password"
					/>
					<button
						onClick={handleSetup}
						disabled={isSubmitting}
						type="submit"
						className="btn btn-sm ml-2 rounded px-4 py-2 btn-primary"
					>
						{isSubmitting ? "Checking..." : "Confirm Password"}
					</button>
				</form>
			</WithStep>
			<WithStep step={SetupStep.DisplayQrCode} current={step}>
				<form className="mt-4 space-y-10">
					<div className="grid grid-cols-2 space-y-5">
						<div className="col-span-2 space-y-5">
							<p className="text-sm">
								Trenger du en 2-trinnsinnloggingsapp? Last ned en av de følgende
							</p>
							<ul>
								<li className="flex items-center text-sm">
									<svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
										<path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z" />
									</svg>
									iOS-enheter:
									<a
										href="https://itunes.apple.com/us/app/authy/id494168017?mt=8"
										target="_blank"
										rel="noreferrer"
										className="ml-2 text-blue-600 hover:underline"
									>
										Authy
									</a>
								</li>
								<li className="flex items-center text-sm">
									<svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
										<path d="M16.61 15.15C16.15 15.15 15.77 14.78 15.77 14.32S16.15 13.5 16.61 13.5H16.61C17.07 13.5 17.45 13.86 17.45 14.32C17.45 14.78 17.07 15.15 16.61 15.15M7.41 15.15C6.95 15.15 6.57 14.78 6.57 14.32C6.57 13.86 6.95 13.5 7.41 13.5H7.41C7.87 13.5 8.24 13.86 8.24 14.32C8.24 14.78 7.87 15.15 7.41 15.15M16.91 10.14L18.58 7.26C18.67 7.09 18.61 6.88 18.45 6.79C18.28 6.69 18.07 6.75 17.97 6.91L16.29 9.82C14.95 9.12 13.5 8.75 12 8.75C10.5 8.75 9.05 9.12 7.71 9.82L6.03 6.91C5.93 6.75 5.72 6.69 5.55 6.79C5.39 6.88 5.33 7.09 5.42 7.26L7.09 10.14C4.47 11.79 2.75 14.62 2.75 17.88H21.25C21.25 14.62 19.53 11.79 16.91 10.14Z" />
									</svg>
									Android-enheter:
									<a
										href="https://play.google.com/store/apps/details?id=com.authy.authy"
										target="_blank"
										rel="noreferrer"
										className="ml-2 text-blue-600 hover:underline"
									>
										Authy
									</a>
								</li>
								<li className="flex items-center text-sm">
									<svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
										<path d="M3,12V6.75L9,5.43V11.91L3,12M20,3V11.75L10,11.9V5.21L20,3M3,13L9,13.09V19.9L3,18.75V13M20,13.25V22L10,20.09V13.1L20,13.25Z" />
									</svg>
									Windows-enheter:
									<a
										href="https://www.microsoft.com/p/authenticator/9wzdncrfj3rj"
										target="_blank"
										rel="noreferrer"
										className="ml-2 text-blue-600 hover:underline"
									>
										Microsoft Authenticator
									</a>
								</li>
							</ul>
							<p className="text-sm">
								Disse appene er anbefalt, men andre autentiseringsapper vil også fungere.
							</p>
						</div>
						<p className="mb-2 text-sm">Scan this QR code with your authenticator app.</p>
						<section className="flex justify-center">
							<img src={state.dataUri} alt="totp" width={150} />
						</section>
					</div>
					<p className="mt-2 text-sm">
						If you can't scan the QR code, enter this secret manually:{" "}
						<kbd className="kbd kbd-lg">{state.secret}</kbd>
					</p>
					<footer className="flex justify-end">
						<button
							onClick={() => setStep(SetupStep.EnterTotpCode)}
							className="btn btn-sm ml-2 rounded px-4 py-2 btn-primary"
							type="submit"
						>
							Next
						</button>
					</footer>
				</form>
			</WithStep>
			<WithStep step={SetupStep.EnterTotpCode} current={step}>
				<form className="mt-4">
					<div className="mt-4 space-y-10">
						<div className="grid grid-cols-1 gap-3">
							<h3 className="mb-2">Verify your TOTP setup</h3>
							<p>Enter the code from your authenticator app to verify and enable TOTP.</p>
							<TwoFactAuthDigits value={totpCode} onChange={setTotpCode} />
						</div>
						<footer className="flex justify-end">
							<button
								type="button"
								className="btn btn-sm ml-2 rounded px-4 py-2 btn-outline"
								onClick={() => setStep(SetupStep.DisplayQrCode)}
							>
								Back
							</button>
							<button
								onClick={() => handleEnable(totpCode)}
								disabled={isSubmitting}
								type="submit"
								className="btn btn-sm ml-2 rounded px-4 py-2 btn-primary"
							>
								{isSubmitting ? "Verifying..." : "Verify and Enable"}
							</button>
						</footer>
					</div>
				</form>
			</WithStep>
		</div>
	);
};

export default TOTPSetup;
