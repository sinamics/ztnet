import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "~/i18n/routing";
import { TRPCReactProvider } from "~/trpc/react";
import { SessionProvider } from "next-auth/react";
import { auth } from "~/server/auth";

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

export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params;
}) {
	const param = await params;
	const locale = param?.locale;
	const session = await auth();

	// Ensure that the incoming `locale` is valid
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	if (!routing.locales.includes(locale as any)) {
		notFound();
	}
	// Providing all messages to the client
	// side is the easiest way to get started
	const messages = await getMessages();
	return (
		<html lang="en">
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<TRPCReactProvider>
					<SessionProvider session={session}>
						<NextIntlClientProvider messages={messages}>
							{children}
						</NextIntlClientProvider>
					</SessionProvider>
				</TRPCReactProvider>
			</body>
		</html>
	);
}
