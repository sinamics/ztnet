import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest } from "next/server";

const intlMiddleware = createMiddleware(routing);
// export { auth as middleware } from "~/server/auth";
// This middleware will handle both i18n and auth
export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Skip i18n middleware for auth routes
	if (pathname.startsWith("/api/auth")) {
		return; // Let the auth routes pass through without i18n handling
	}
	if (pathname.startsWith("/api/ws")) {
		return; // Let the auth routes pass through without i18n handling
	}

	// Handle i18n for all other routes
	return intlMiddleware(request);
}

export const config = {
	matcher: [
		// Enable a redirect to a matching locale at the root
		"/",
		// Set a cookie to remember the previous locale for
		// all requests that have a locale prefix
		"/(en)/:path*",

		// Enable redirects that add missing locales
		// (e.g. `/pathnames` -> `/en/pathnames`)
		"/((?!_next|_vercel|.*\\..*).*)",
		"/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
	],
};
