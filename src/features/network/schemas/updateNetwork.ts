import { z } from "zod";

export const updateNetworkSchema = z.object({
	nwid: z.string(),
	central: z.boolean().default(false),
	organizationId: z.string().optional(),
	updateParams: z.object({
		name: z.string().min(1, "Name cannot be empty"),
	}),
});

export type UpdateNetworkInputType = z.infer<typeof updateNetworkSchema>;
