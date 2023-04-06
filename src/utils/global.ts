// Get the title from the environment variable NEXT_PUBLIC_SITE_NAME.
// If it is not set, use the default value "Next ZTnet".
export const globalSiteTitle =
  process.env.NEXT_PUBLIC_SITE_NAME || "Next ZTnet";

export const globalSiteVersion = process.env.NEXT_PUBLIC_APP_VERSION || null;
