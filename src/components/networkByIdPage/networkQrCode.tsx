import { useTheme } from "next-themes";
import { QRCodeSVG } from "qrcode.react";
import React, { useEffect, useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import toast from "react-hot-toast";
import daisyuiColors from "daisyui/src/theming/themes";
import { useTranslations } from "next-intl";

interface IProps {
	networkId: string;
}

const urlBuilder = (networkId: string) => {
	return `https://joinzt.com/addnetwork?nwid=${networkId}&v=1`;
};

const NetworkQrCode = ({ networkId }: IProps) => {
	const t = useTranslations("networkById");
	const [themeRGBColor, setThemeRGBColor] = useState("");
	const { theme } = useTheme();

	useEffect(() => {
		setThemeRGBColor(daisyuiColors[theme]?.primary);
	}, [theme]);

	return (
		<CopyToClipboard
			text={urlBuilder(networkId)}
			onCopy={() =>
				toast.success(
					t("copyToClipboard.success", {
						element: urlBuilder(networkId),
					}),
					{
						id: "copyNwid",
					},
				)
			}
			title={t("copyToClipboard.title")}
		>
			<QRCodeSVG
				value={urlBuilder(networkId)}
				size={100}
				bgColor={themeRGBColor}
				fgColor={"#000000"}
				level={"M"}
				includeMargin={true}
			/>
		</CopyToClipboard>
	);
};

export default NetworkQrCode;
