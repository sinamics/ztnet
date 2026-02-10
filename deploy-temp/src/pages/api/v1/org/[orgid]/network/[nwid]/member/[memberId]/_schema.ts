import { z } from "zod";

// Schema for POST request body
export const PostBodySchema = z
	.object({
		name: z.string().optional(),
		description: z.string().optional(),
		authorized: z.boolean().optional(),
	})
	.strict();

// Schema for the context passed to the handler
export const HandlerContextSchema = z.object({
	networkId: z.string(),
	orgId: z.string(),
	memberId: z.string(),
	userId: z.string(),
	body: z.record(z.unknown()).optional().default({}),
	ctx: z.object({
		prisma: z.any(),
		session: z.object({
			user: z.object({
				id: z.string(),
			}),
		}),
	}),
});
