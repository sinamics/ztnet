import { createAuthClient } from "better-auth/react";
import { genericOAuthClient } from "better-auth/client/plugins";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { Auth } from "./auth";

export const authClient = createAuthClient<Auth>({
	// Do NOT set baseURL - let it default to current browser origin
	// (skill guide lesson #3: hardcoded baseURL breaks when accessed via IP)
	plugins: [genericOAuthClient(), inferAdditionalFields<Auth>()],
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;
