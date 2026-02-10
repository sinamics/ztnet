import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useFontSizeStore } from "~/utils/store";

const fontSizeOptions = {
	Small: "text-xs",
	Medium: "text-base",
	Large: "text-lg",
};

const ApplicationFontSize = () => {
	const t = useTranslations("userSettings");
	const { fontSize, setFontSize } = useFontSizeStore();
	const [localFontSize, setLocalFontSize] = useState(fontSize);

	useEffect(() => {
		// Apply the font size class to the document element
		document.documentElement.className = fontSizeOptions[localFontSize];
		// Save the font size to the store whenever it changes
		setFontSize(localFontSize);
	}, [localFontSize, setFontSize]);

	return (
		<div>
			<div className="form-control w-full max-w-xs">
				<label className="label">
					<span className="label-text font-medium">
						{t("account.accountPreferences.fontSize")}
					</span>
				</label>
				<select
					value={localFontSize}
					onChange={(e) => setLocalFontSize(e.target.value)}
					className="select select-bordered select-sm"
				>
					{Object.keys(fontSizeOptions).map((name) => (
						<option key={name} value={name}>
							{name}
						</option>
					))}
				</select>
			</div>
		</div>
	);
};

export default ApplicationFontSize;
