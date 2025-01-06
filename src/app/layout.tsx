import { ReactNode } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./styles/globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import { WebsocketProvider } from "~/components/providers/socketProvider";

type Props = {
	children: ReactNode;
};
const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "ZTNET",
	description: "Zerotier web interface",
};
// Since we have a `not-found.tsx` page on the root, a layout file
// is required, even if it's just passing children through.
export default function RootLayout({ children }: Props) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head />
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<Toaster
					position="bottom-right"
					toastOptions={{
						style: {
							border: "1px solid #191919",
							color: "#fff",
							background: "#404040",
							wordWrap: "break-word",
							overflowWrap: "anywhere",
						},
					}}
				/>
				<ThemeProvider>
					<WebsocketProvider>{children}</WebsocketProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
