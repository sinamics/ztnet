import { z } from "zod";
import type { PrismaClient } from "@prisma/client";

// Schema for POST request body
export const PostBodySchema = z
	.object({
		name: z.string().optional(),
		description: z.string().optional(),
		authorized: z.boolean().optional(),
		activeBridge: z.boolean().optional(),
		capabilities: z.array(z.number()).optional(),
		ipAssignments: z.array(z.string()).optional(),
		noAutoAssignIps: z.boolean().optional(),
		ssoExempt: z.boolean().optional(),
		tags: z.array(z.tuple([z.number(), z.number()])).optional(),
	})
	.strict();

// Schema for the context passed to the handler
export const HandlerContextSchema = z.object({
	networkId: z.string(),
	orgId: z.string(),
	memberId: z.string(),
	userId: z.string(),
	body: z.record(z.string(), z.custom<PrismaClient>()).optional().default({}),
	ctx: z.object({
		prisma: z.custom<PrismaClient>(),
		session: z.object({
			user: z.object({
				id: z.string(),
			}),
		}),
	}),
});
