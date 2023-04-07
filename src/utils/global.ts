// Get the title from the environment variable NEXT_PUBLIC_SITE_NAME.

import { env } from "~/env.mjs";

// If it is not set, use the default value "Next ZTnet".
export const globalSiteTitle = env.NEXT_PUBLIC_SITE_NAME || "Next ZTnet";

export const globalSiteVersion = env.NEXT_PUBLIC_APP_VERSION || null;
// eslint-disable-next-line no-console
console.log(env);
