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
	// Dynamically determine the base URL from the X-Forwarded-Host and X-Forwarded-Proto headers
	const forwardedHost = req.headers.get("x-forwarded-host");
	const forwardedProto = req.headers.get("x-forwarded-proto");

	let protocol: string;
	let host: string;

	if (forwardedHost && forwardedProto) {
		// Use the forwarded headers if they exist
		host = forwardedHost;
		protocol = forwardedProto;
	} else {
		// Fallback to parsing the req.url
		const url = new URL(req.url);
		host = url.host;
		protocol = url.protocol.slice(0, -1); // Remove the trailing colon from protocol
	}

	const baseUrl = `${protocol}://${host}`;

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
			// Parse the Accept-Language header and sort by quality score
			const locales = acceptLanguageHeader
				.split(",")
				.map((lang) => {
					const [locale, qValue] = lang.trim().split(";q=");
					return {
						locale: locale.split("-")[0],
						quality: qValue ? parseFloat(qValue) : 1,
					};
				})
				.sort((a, b) => b.quality - a.quality); // Sort based on quality values
			// Select the first supported locale with the highest quality score
			const matchedLocale = locales.find((l) => supportedLocales.includes(l.locale));
			if (matchedLocale) {
				preferredLocale = matchedLocale.locale;
			}
		}
		// Redirect to the preferred locale if it's different from the current one
		if (preferredLocale !== req.nextUrl.locale) {
			return NextResponse.redirect(
				new URL(
					`/${preferredLocale}${req.nextUrl.pathname}${req.nextUrl.search}`,
					baseUrl,
				),
			);
		}
	}
}
