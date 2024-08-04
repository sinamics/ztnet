import classNames from "classnames";
import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { ErrorCode } from "~/utils/errorCode";
import { useModalStore } from "~/utils/store";
import TwoFactAuthDigits from "./totpDigits";
import { api } from "~/utils/api";
import { IOSIcon } from "~/icons/IOSIcon";
import { AndroidIcon } from "~/icons/androidIcon";
import { WindowsIcon } from "~/icons/windowsIcon";
import { useTranslations } from "next-intl";

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
	const t = useTranslations("userSettings");
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
					<p className="text-sm">
						{t("account.totp.totpActivation.confirmPassword.description")}
					</p>
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
								{t("account.totp.totpActivation.displayQrCode.description")}
							</p>
							<ul>
								<li className="flex items-center text-sm">
									<IOSIcon className="w-5 h-5 mr-1" fill="none" />
									{t("account.totp.totpActivation.displayQrCode.IOS")}
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
									<AndroidIcon className="w-5 h-5 mr-1" fill="none" />
									{t("account.totp.totpActivation.displayQrCode.Android")}
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
									<WindowsIcon className="w-5 h-5 mr-1" fill="none" />
									{t("account.totp.totpActivation.displayQrCode.Windows")}

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
								{t("account.totp.totpActivation.displayQrCode.appDescription")}
							</p>
						</div>
						<p className="mb-2 text-sm">
							{t("account.totp.totpActivation.displayQrCode.scanQrDescription")}
						</p>
						<section className="flex justify-center">
							<img src={state.dataUri} alt="totp" width={150} />
						</section>
					</div>
					<p className="mt-2 text-sm">
						{t("account.totp.totpActivation.displayQrCode.manualEntry")}
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
							<h3 className="mb-2">
								{t("account.totp.totpActivation.enterTotpCode.description")}
							</h3>
							<p> {t("account.totp.totpActivation.enterTotpCode.enterCode")}</p>
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
