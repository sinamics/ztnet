import { z } from "zod";
import type { PrismaClient } from "@prisma/client";

// Schema for the request body when creating a new network
export const createNetworkBodySchema = z
	.object({
		name: z.string().optional(),
	})
	.strict();

// Schema for the context passed to the handler
export const createNetworkContextSchema = z.object({
	body: createNetworkBodySchema,
	ctx: z.object({
		prisma: z.custom<PrismaClient>(),
		session: z.object({
			user: z.object({
				id: z.string(),
			}),
		}),
	}),
});
