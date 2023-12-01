import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { useState, type ReactElement, type ReactNode } from "react";
import type { NextPage } from "next";
import type { AppProps } from "next/app";
import { api } from "~/utils/api";
import { ThemeProvider } from "next-themes";
import "~/styles/globals.css";
import { Toaster } from "react-hot-toast";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect } from "react";
import { NextIntlClientProvider } from "next-intl";
import { useRouter } from "next/router";
import { useHandleResize } from "~/hooks/useHandleResize";
import { supportedLocales } from "~/locales/lang";
import { useSocketStore } from "~/utils/store";

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
	getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
	Component: NextPageWithLayout;
};

const App: AppType<{ session: Session | null }> = ({
	Component,
	pageProps: { session, messages, ...pageProps },
}: AppPropsWithLayout) => {
	const { setupSocket, cleanupSocket } = useSocketStore();
	const { asPath, locale, push } = useRouter();
	const [isClient, setIsClient] = useState(false);
	const { data: orgData } = api.org.getOrgIdbyUserid.useQuery();

	useHandleResize();

	// just wait for the client to be ready. We check screen size in the useHandleResize hook
	useEffect(() => {
		setIsClient(true);
	}, []);

	useEffect(() => {
		if (!orgData) return;
		setupSocket(orgData);
		return () => {
			cleanupSocket();
		};
	}, [orgData]);

	useEffect(() => {
		// On component initialization, retrieve the preferred language from local storage
		const storedLocale = localStorage.getItem("ztnet-language");
		if (
			storedLocale &&
			storedLocale !== locale &&
			supportedLocales.includes(storedLocale)
		) {
			void push(asPath, asPath, { locale: storedLocale });
		}
	}, []);

	useEffect(() => {
		// Set a CSS variable to hold the window height
		const vh = window.innerHeight * 0.01;
		document.documentElement.style.setProperty("--vh", `${vh}px`);

		// Listen to the resize event and recalculate the CSS variable
		window.addEventListener("resize", () => {
			const vh = window.innerHeight * 0.01;
			document.documentElement.style.setProperty("--vh", `${vh}px`);
		});
	}, []);
	const getLayout = Component.getLayout ?? ((page) => page);

	if (!isClient) {
		return null;
	}
	return (
		<ThemeProvider defaultTheme="system">
			<NextIntlClientProvider
				locale={locale}
				onError={(err) => console.warn(err)}
				messages={messages}
			>
				<ReactQueryDevtools initialIsOpen={false} />
				<Toaster
					position="bottom-right"
					toastOptions={{
						className: "bg-primary-500",
						style: {
							border: "1px solid #191919",
							color: "#fff",
							background: "#404040",
						},
					}}
				/>
				<SessionProvider session={session}>
					{getLayout(<Component {...pageProps} />)}
				</SessionProvider>
			</NextIntlClientProvider>
		</ThemeProvider>
	);
};

export default api.withTRPC(App);
