// src/server/auth.ts
import NextAuth from "next-auth";
import { cache } from "react";
import { authConfig } from "./config";

const authOptions = authConfig;

const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authOptions);

const auth = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };
