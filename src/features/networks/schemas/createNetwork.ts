import { z } from "zod";

// Input validation
export const createNetworkSchema = z.object({
	central: z.boolean().optional().default(false),
	name: z.string().optional(),
});

export type CreateNetworkInputType = z.infer<typeof createNetworkSchema>;
