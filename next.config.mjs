/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
!process.env.SKIP_ENV_VALIDATION && (await import("./src/env.mjs"));

/** @type {import("next").NextConfig} */
const config = {
	reactStrictMode: true,
	swcMinify: true,
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
		locales: ["en", "fr", "no", "pl", "zh-tw", "zh", "es", "ru"],
	},
	trailingSlash: true,
	eslint: {
		ignoreDuringBuilds: true,
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
};
export default config;
