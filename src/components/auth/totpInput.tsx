import React from "react";
import TwoFactAuth from "./totpDigits";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface TOTPInputProps {
	totpCode: string;
	setTotpCode: (code: string) => void;
}

const TOTPInput: React.FC<TOTPInputProps> = ({ totpCode, setTotpCode }) => {
	const t = useTranslations();
	return (
		<div className="space-y-2">
			<label className="text-sm font-medium tracking-wide">
				{t("authPages.form.enter2FAcode")}
			</label>
			<TwoFactAuth value={totpCode} onChange={(val) => setTotpCode(val)} />
			<Link
				href="/auth/mfaRecovery"
				className="text-sm text-blue-500 hover:text-blue-700"
			>
				{t("authPages.signin.havingIssues")}
			</Link>
		</div>
	);
};

export default TOTPInput;
