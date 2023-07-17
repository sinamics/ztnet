/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { type ReactElement, type ReactNode } from "react";
import type { NextPage } from "next";
import type { AppProps } from "next/app";
import { api } from "~/utils/api";
import { ThemeProvider } from "next-themes";
import "~/styles/globals.css";
import { Toaster } from "react-hot-toast";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import Modal from "~/components/elements/modal";
import { useEffect } from "react";
// eslint-disable-next-line @typescript-eslint/ban-types
export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

const App: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}: AppPropsWithLayout) => {
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
  return (
    <ThemeProvider defaultTheme="system">
      <Modal />
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
    </ThemeProvider>
  );
};

export default api.withTRPC(App);
