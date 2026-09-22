import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
	return (
		<Html>
			<Head>
				{/* Icons live here so every page carries them in the server rendered
				    head, instead of relying on the browser's /favicon.ico fallback. */}
				<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48" />
				<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
				<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
				<link rel="manifest" href="/manifest.json" />
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}
