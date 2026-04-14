import { PrismaClient } from "@prisma/client";
import type { Session } from "~/lib/authTypes";

export interface UserContext {
	session: Session;
	prisma: PrismaClient;
}
