import { NextRequest, NextResponse } from "next/server";
import { supportedLocales } from "./locales/lang";

// run middleware on these paths
export const config = {
	matcher: [
		"/dashboard/:path*",
		"/organization/:path*",
		"/network/:path*",
		"/central/:path*",
		"/user-settings/:path*",
		"/auth/:path*",
		"/admin/:path*",
	],
};

const PUBLIC_FILE = /\.(.*)$/;

export async function middleware(req: NextRequest) {
	if (
		req.nextUrl.pathname.startsWith("/_next") ||
		req.nextUrl.pathname.includes("/api/") ||
		PUBLIC_FILE.test(req.nextUrl.pathname)
	) {
		return;
	}

	// Handle automatic locale detection
	if (req.nextUrl.locale === "default") {
		const fallbackLocale = "en";
		const acceptLanguageHeader = req.headers.get("accept-language");
		let preferredLocale = fallbackLocale;

		if (acceptLanguageHeader) {
			const locales = acceptLanguageHeader
				.split(",")
				.map((lang) => {
					const [locale, qValue] = lang.trim().split(";q=");
					return {
						locale: locale.split("-")[0],
						quality: qValue ? parseFloat(qValue) : 1,
					};
				})
				.sort((a, b) => b.quality - a.quality);
			const matchedLocale = locales.find((l) => supportedLocales.includes(l.locale));
			if (matchedLocale) {
				preferredLocale = matchedLocale.locale;
			}
		}

		// Use the host from the request headers
		const hostname = req.headers.get("host") || "";

		if (preferredLocale !== req.nextUrl.locale) {
			const newUrl = new URL(
				`/${preferredLocale}${req.nextUrl.pathname}${req.nextUrl.search}`,
				`${req.nextUrl.protocol}//${hostname}`,
			);
			return NextResponse.redirect(newUrl);
		}
	}
}
