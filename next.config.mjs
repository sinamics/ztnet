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
    locales: ["en", "no", "zh", "es"],
  },
  images: {
    domains: ["pbs.twimg.com"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
export default config;
