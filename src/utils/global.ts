// Get the title from the environment variable NEXT_PUBLIC_SITE_NAME.

import { env } from "~/env.mjs";

export const globalSiteVersion = env.NEXT_PUBLIC_APP_VERSION || "development";
