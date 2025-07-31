import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
	// Get the pathname
	const { pathname, search } = request.nextUrl;

	console.log("Middleware - pathname:", pathname, "search:", search);

	// List of supported locales from next.config.mjs
	const locales = ["en", "fr", "no", "pl", "zh-tw", "zh", "es", "ru"];
	const defaultLocale = "en";

	// Check if the pathname already has a locale
	const pathnameHasLocale = locales.some(
		(locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
	);

	console.log("Middleware - pathnameHasLocale:", pathnameHasLocale);

	// If pathname already has a locale, continue normally
	if (pathnameHasLocale) {
		return NextResponse.next();
	}

	// Get the user's preferred language from Accept-Language header
	const acceptLanguage = request.headers.get("accept-language") || "";
	const preferredLocale = getPreferredLocale(acceptLanguage, locales, defaultLocale);

	console.log(
		"Middleware - acceptLanguage:",
		acceptLanguage,
		"preferredLocale:",
		preferredLocale,
	);

	// Handle root path - redirect to localized auth/login
	if (pathname === "/") {
		const url = request.nextUrl.clone();
		if (preferredLocale !== defaultLocale) {
			url.pathname = `/${preferredLocale}/auth/login`;
		} else {
			url.pathname = "/auth/login";
		}
		return NextResponse.redirect(url);
	}

	// Special handling for auth routes with invitation tokens
	const hasInviteToken =
		search.includes("invite=") || search.includes("organizationInvite=");
	console.log(
		"Middleware - hasInviteToken:",
		hasInviteToken,
		"pathname check:",
		pathname.startsWith("/auth/"),
	);

	if (
		(pathname.startsWith("/auth/") || pathname.startsWith("/auth/register/")) &&
		hasInviteToken
	) {
		console.log("Middleware - Redirecting invite URL to locale:", preferredLocale);
		// Only redirect to localized version if it's not the default locale
		// Let the page handle invite validation first
		if (preferredLocale !== defaultLocale) {
			// Extract the invite token to do a basic length check
			const inviteMatch = search.match(/[?&]invite=([^&]+)/);
			const orgInviteMatch = search.match(/[?&]organizationInvite=([^&]+)/);
			const token = inviteMatch?.[1] || orgInviteMatch?.[1];

			// Only redirect if the token looks valid (basic length check)
			// JWT tokens are typically much longer than a few characters
			if (token && token.length > 10) {
				const url = request.nextUrl.clone();
				url.pathname = `/${preferredLocale}${pathname}`;
				console.log("Middleware - Redirecting to:", url.pathname + url.search);
				return NextResponse.redirect(url);
			}
		}
	}

	// For other auth routes, also apply locale detection
	if (pathname.startsWith("/auth/") && !hasInviteToken) {
		if (preferredLocale !== defaultLocale) {
			const url = request.nextUrl.clone();
			url.pathname = `/${preferredLocale}${pathname}`;
			return NextResponse.redirect(url);
		}
	}

	return NextResponse.next();
}

function getPreferredLocale(
	acceptLanguage: string,
	locales: string[],
	defaultLocale: string,
): string {
	// Parse Accept-Language header
	const languages = acceptLanguage
		.split(",")
		.map((lang) => {
			const [locale, q = "1"] = lang.trim().split(";q=");
			return {
				locale: locale.toLowerCase(),
				quality: parseFloat(q),
			};
		})
		.sort((a, b) => b.quality - a.quality);

	// Find the best matching locale
	for (const { locale } of languages) {
		// Direct match
		if (locales.includes(locale)) {
			return locale;
		}

		// Language code match (e.g., 'zh' matches 'zh-tw')
		const languageCode = locale.split("-")[0];
		const matchingLocale = locales.find((l) => l.startsWith(languageCode));
		if (matchingLocale) {
			return matchingLocale;
		}
	}

	return defaultLocale;
}

export const config = {
	matcher: [
		// Match all request paths except for the ones starting with:
		// - api (API routes)
		// - _next/static (static files)
		// - _next/image (image optimization files)
		// - favicon.ico (favicon file)
		"/((?!api|_next/static|_next/image|favicon.ico).*)",
	],
};
