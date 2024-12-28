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
import { Inter } from "next/font/google";
import { useFontSizeStore } from "~/utils/store";
import useDynamicViewportHeight from "~/hooks/useDynamicViewportHeight";

const inter = Inter({ subsets: ["latin"] });

export type NextPageWithLayout = NextPage & {
	getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
	Component: NextPageWithLayout;
};

const fontSizeOptions = {
	Small: "text-[0.75rem]",
	Medium: "text-[1rem]",
	Large: "text-[1.25rem]",
	"Extra Large": "text-[1.5rem]",
};

const App: AppType<{ session: Session | null }> = ({
	Component,
	pageProps: { session, messages, ...pageProps },
}: AppPropsWithLayout) => {
	const { asPath, locale, push } = useRouter();
	const [isClient, setIsClient] = useState(false);
	const { fontSize } = useFontSizeStore();

	useHandleResize();

	// just wait for the client to be ready. We check screen size in the useHandleResize hook
	useEffect(() => {
		setIsClient(true);
	}, []);

	// Apply font size from store
	useEffect(() => {
		document.documentElement.className = fontSizeOptions[fontSize] || "text-[1rem]";
	}, [fontSize]);

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
	}, [asPath, locale, push]);

	useEffect(() => {
		// Set a CSS variable to hold the window height
		const vh = window.innerHeight * 0.01;
		document.documentElement.style.setProperty("--vh", `${vh}px`);

		// Listen to the resize event and recalculate the CSS variable
		window.addEventListener("resize", () => {
			const vh = window.innerHeight * 0.01;
			document.documentElement.style.setProperty("--vh", `${vh}px`);
		});

		if (typeof window !== "undefined" && "serviceWorker" in navigator) {
			navigator.serviceWorker
				.register("/service-worker.js")
				// .then((registration) => {
				// 	console.log("Service Worker registered with scope:", registration.scope);
				// })
				.catch((error) => {
					console.error("Service Worker registration failed:", error);
				});
		}
	}, []);

	// Update viewport height on font size change
	useDynamicViewportHeight([fontSize]);

	const getLayout = Component.getLayout ?? ((page) => page);

	if (!isClient) {
		return null;
	}
	return (
		<main className={inter.className}>
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
							style: {
								border: "1px solid #191919",
								color: "#fff",
								background: "#404040",
								wordWrap: "break-word",
								overflowWrap: "anywhere",
							},
						}}
					/>
					<SessionProvider session={session}>
						{getLayout(<Component {...pageProps} />)}
					</SessionProvider>
				</NextIntlClientProvider>
			</ThemeProvider>
		</main>
	);
};

export default api.withTRPC(App);
