import { PrismaClient } from "@prisma/client";
import { Session } from "next-auth";

export interface UserContext {
	session: Session;
	prisma: PrismaClient;
}
