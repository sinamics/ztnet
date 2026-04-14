import type { User as PrismaUser } from "@prisma/client";

/**
 * Session type compatible with what the rest of the app expects.
 * This replaces the next-auth Session type augmentation.
 */
export interface Session {
	user: SessionUser;
	expires: string;
}

export type SessionUser = PrismaUser & {
	deviceId?: string;
};
