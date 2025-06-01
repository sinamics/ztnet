import { useTheme } from "next-themes";
import { QRCodeSVG } from "qrcode.react";
import React, { useEffect, useState } from "react";
import daisyuiColors from "daisyui/theme";
import Link from "next/link";

interface IProps {
	networkId: string;
}

const urlBuilder = (networkId: string) => {
	return `https://joinzt.com/addnetwork?nwid=${networkId}&v=1`;
};

const NetworkQrCode = ({ networkId }: IProps) => {
	const [themeRGBColor, setThemeRGBColor] = useState("");
	const { theme } = useTheme();

	useEffect(() => {
		setThemeRGBColor(daisyuiColors[theme]?.primary);
	}, [theme]);

	return (
		<Link target="_blank" rel="nofollow noopener noreferrer" href={urlBuilder(networkId)}>
			<QRCodeSVG
				value={urlBuilder(networkId)}
				size={100}
				bgColor={themeRGBColor}
				fgColor={"#000000"}
				level={"M"}
				includeMargin={true}
			/>
		</Link>
	);
};

export default NetworkQrCode;
