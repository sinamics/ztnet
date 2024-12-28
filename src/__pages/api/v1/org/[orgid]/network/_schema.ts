import { z } from "zod";

// Schema for the request body when creating a new network
export const createNetworkBodySchema = z
	.object({
		name: z.string().optional(),
	})
	.strict();

// Schema for the context passed to the handler
export const createNetworkContextSchema = z.object({
	body: createNetworkBodySchema,
	orgId: z.string(),
	ctx: z.object({
		prisma: z.any(),
		session: z.object({
			user: z.object({
				id: z.string(),
			}),
		}),
	}),
});
