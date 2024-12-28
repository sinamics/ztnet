import { z } from "zod";

// Schema for updateable fields
export const NetworkUpdateSchema = z
	.object({
		name: z.string().optional(),
		description: z.string().optional(),
		flowRule: z.string().optional(),
		mtu: z.string().optional(),
		private: z.boolean().optional(),
		dns: z
			.object({
				domain: z.string(),
				servers: z.array(z.string()),
			})
			.optional(),
		ipAssignmentPools: z.array(z.unknown()).optional(),
		routes: z.array(z.unknown()).optional(),
		v4AssignMode: z.record(z.unknown()).optional(),
		v6AssignMode: z.record(z.unknown()).optional(),
	})
	.strict();

// Schema for POST request body
const PostBodySchema = z.record(z.unknown());

// Schema for the context passed to the handler
export const HandlerContextSchema = z.object({
	networkId: z.string(),
	ctx: z.object({
		prisma: z.any(),
		session: z.object({
			user: z.object({
				id: z.string(),
			}),
		}),
	}),
	body: PostBodySchema,
});
