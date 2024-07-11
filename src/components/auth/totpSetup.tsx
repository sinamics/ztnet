import React, { useState } from "react";
import { toast } from "react-hot-toast";
import QRCode from "qrcode.react";

const TOTPSetup: React.FC = () => {
	const [setupStage, setSetupStage] = useState<"qr" | "verify">("qr");
	const [qrCodeData, setQRCodeData] = useState<string>("");
	const [secret, setSecret] = useState<string>("");
	const [totpCode, setTotpCode] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const handleEnableTOTP = async () => {
		setIsLoading(true);
		try {
			const response = await fetch("/api/auth/two-factor/enable", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});

			if (!response.ok) {
				throw new Error("Failed to initiate TOTP setup");
			}

			const data = await response.json();
			setQRCodeData(data.qr);
			setSecret(data.secret);
			setSetupStage("qr");
		} catch (error) {
			toast.error(`Error setting up TOTP: ${error.message}`);
		} finally {
			setIsLoading(false);
		}
	};

	const handleVerifyTOTP = async () => {
		setIsLoading(true);
		try {
			const response = await fetch("/api/auth/two-factor/verify", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token: totpCode }),
			});

			if (!response.ok) {
				throw new Error("Failed to verify TOTP");
			}

			toast.success("TOTP enabled successfully");
			setSetupStage("qr");
		} catch (error) {
			toast.error(`Error verifying TOTP: ${error.message}`);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="mt-4">
			{/* {setupStage === "initial" && (
				<button
					onClick={handleEnableTOTP}
					disabled={isLoading}
					className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
				>
					{isLoading ? "Setting up..." : "Enable TOTP"}
				</button>
			)} */}

			{setupStage === "qr" && (
				<div className="mt-4">
					<h3 className="mb-2 text-lg font-semibold">
						Scan this QR code with your authenticator app
					</h3>
					<QRCode value={qrCodeData} size={256} />
					<p className="mt-2">
						If you can't scan the QR code, enter this secret manually:{" "}
						<strong>{secret}</strong>
					</p>
					<button
						onClick={() => setSetupStage("verify")}
						className="mt-4 rounded bg-green-500 px-4 py-2 font-bold text-white hover:bg-green-700"
					>
						Next
					</button>
				</div>
			)}

			{setupStage === "verify" && (
				<div className="mt-4">
					<h3 className="mb-2 text-lg font-semibold">Verify your TOTP setup</h3>
					<p>Enter the code from your authenticator app to verify and enable TOTP.</p>
					<input
						type="text"
						value={totpCode}
						onChange={(e) => setTotpCode(e.target.value)}
						className="mt-2 rounded border p-2"
						placeholder="Enter TOTP code"
					/>
					<button
						onClick={handleVerifyTOTP}
						disabled={isLoading}
						className="ml-2 rounded bg-green-500 px-4 py-2 font-bold text-white hover:bg-green-700"
					>
						{isLoading ? "Verifying..." : "Verify and Enable"}
					</button>
				</div>
			)}
		</div>
	);
};

export default TOTPSetup;
