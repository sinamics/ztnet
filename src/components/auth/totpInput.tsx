import React from "react";
import TwoFactAuth from "./totpDigits";

interface TOTPInputProps {
	totpCode: string;
	setTotpCode: (code: string) => void;
}

const TOTPInput: React.FC<TOTPInputProps> = ({ totpCode, setTotpCode }) => (
	<div className="space-y-2">
		<label className="text-sm font-medium tracking-wide">TOTP Code</label>
		<TwoFactAuth value={totpCode} onChange={(val) => setTotpCode(val)} />
	</div>
);

export default TOTPInput;
