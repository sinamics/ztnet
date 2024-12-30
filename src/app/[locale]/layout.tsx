import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "~/i18n/routing";
import { TRPCReactProvider } from "~/trpc/react";
import { SessionProvider } from "next-auth/react";
import { auth } from "~/server/auth";
// import ZtnetThemeProvider from "~/components/providers/themeProvider";

export default async function RootLayout({
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
		<TRPCReactProvider>
			<SessionProvider session={session}>
				<NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
			</SessionProvider>
		</TRPCReactProvider>
	);
}
