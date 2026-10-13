import type { User as PrismaUser } from "@prisma/client";
import type { UserSecretField } from "~/server/api/userFields";

/**
 * Session type compatible with what the rest of the app expects.
 * This replaces the next-auth Session type augmentation.
 */
export interface Session {
	user: SessionUser;
	expires: string;
}

// The password hash and two factor secrets are never part of a session.
export type SessionUser = Omit<PrismaUser, UserSecretField> & {
	deviceId?: string;
};
