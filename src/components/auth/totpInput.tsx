import React from "react";
import TwoFactAuth from "./totpDigits";
import Link from "next/link";

interface TOTPInputProps {
	totpCode: string;
	setTotpCode: (code: string) => void;
}

const TOTPInput: React.FC<TOTPInputProps> = ({ totpCode, setTotpCode }) => (
	<div className="space-y-2">
		<label className="text-sm font-medium tracking-wide">Enter 2FA Code</label>
		<TwoFactAuth value={totpCode} onChange={(val) => setTotpCode(val)} />
		<Link href="/auth/mfaRecovery" className="text-sm text-blue-600">
			Having problems?
		</Link>
	</div>
);

export default TOTPInput;
