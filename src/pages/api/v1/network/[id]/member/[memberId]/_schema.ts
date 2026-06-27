import { z } from "zod";
import type { PrismaClient } from "@prisma/client";

// Schema for updateable fields metadata
export const updateableFieldsMetaSchema = z
	.object({
		name: z.string().optional(),
		description: z.string().optional(),
		authorized: z.boolean().optional(),
		// Restore a stashed (deleted) member with `deleted: false`. A boolean is
		// parsed here, but `deleted: true` is rejected by the handler with a 400
		// (use the DELETE method to stash a member).
		deleted: z.boolean().optional(),
	})
	.strict();

// Schema for the context passed to the handler
export const handlerContextSchema = z.object({
	body: z.record(z.string(), z.unknown()),
	userId: z.string(),
	networkId: z.string(),
	memberId: z.string(),
	ctx: z.object({
		prisma: z.custom<PrismaClient>(),
		session: z.object({
			user: z.object({
				id: z.string(),
			}),
		}),
	}),
});

// Schema for the context passed to the DELETE handler
export const deleteHandlerContextSchema = z.object({
	userId: z.string(),
	networkId: z.string(),
	memberId: z.string(),
	ctx: z.object({
		prisma: z.custom<PrismaClient>(),
		session: z.object({
			user: z.object({
				id: z.string(),
			}),
		}),
	}),
});
