/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
!process.env.SKIP_ENV_VALIDATION && (await import("./src/env.mjs"));

/** @type {import("next").NextConfig} */
const config = {
	reactStrictMode: true,
	allowedDevOrigins: ["10.0.0.217"],
	// https://nextjs.org/docs/advanced-features/output-file-tracing
	output: "standalone",
	/**
	 * If you have the "experimental: { appDir: true }" setting enabled, then you
	 * must comment the below `i18n` config out.
	 *
	 * @see https://github.com/vercel/next.js/issues/41980
	 */
	i18n: {
		defaultLocale: "en",
		// localeDetection: false,
		locales: ["en", "fr", "no", "pl", "zh-tw", "zh", "es", "ru", "de", "ua"],
	},
	async redirects() {
		return [
			{
				source: "/",
				destination: "/auth/login",
				permanent: true,
			},
		];
	},
	async rewrites() {
		// Legacy OAuth callback URL preserved for backwards compatibility.
		// Pre-better-auth ztnet docs instructed users to register
		// `${NEXTAUTH_URL}/api/auth/callback/oauth` with their IdP. better-auth's
		// genericOAuth plugin serves the callback at `/api/auth/oauth2/callback/:providerId`,
		// so we forward the legacy path internally. The redirect_uri sent to the IdP is
		// pinned to the legacy path in `src/lib/auth.ts` (`legacyOAuthRedirectURI`).
		return [
			{
				source: "/api/auth/callback/oauth",
				destination: "/api/auth/oauth2/callback/oauth",
			},
		];
	},
};
export default config;
