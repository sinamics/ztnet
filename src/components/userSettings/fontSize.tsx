import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";

const ApplicationFontSize = () => {
	const t = useTranslations("userSettings");
	const [fontSize, setFontSize] = useState(() => {
		// Get font size from local storage or default to "Medium"
		const savedFontSize = localStorage.getItem("appFontSize");
		return savedFontSize || "Medium";
	});

	useEffect(() => {
		// Apply the font size class to the document element
		document.documentElement.className = fontSizeOptions[fontSize];
		// Save the font size to local storage whenever it changes
		localStorage.setItem("appFontSize", fontSize);
	}, [fontSize]);

	const fontSizeOptions = {
		Small: "text-xs",
		Medium: "text-base",
		Large: "text-lg",
	};

	return (
		<div>
			<div className="form-control w-full max-w-xs">
				<label className="label">
					<span className="label-text font-medium">
						{t("account.accountPreferences.fontSize")}
					</span>
				</label>
				<select
					value={fontSize}
					onChange={(e) => setFontSize(e.target.value)}
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
