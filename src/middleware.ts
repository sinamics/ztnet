import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);
export { auth as middleware } from "~/auth";

export const config = {
	// Match only internationalized pathnames
	matcher: ["/", "/(no|en|fr)/:path*"],
};
