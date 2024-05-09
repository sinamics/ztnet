// Get the title from the environment variable NEXT_PUBLIC_SITE_NAME.

import { env } from "~/env.mjs";

// If it is not set, use the default value "ZTnet".
export const globalSiteTitle = process.env.NEXT_PUBLIC_SITE_NAME || "ZTNET";

export const globalSiteVersion = env.NEXT_PUBLIC_APP_VERSION || "development";
