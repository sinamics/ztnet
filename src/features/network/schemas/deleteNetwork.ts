import { z } from "zod";

// Input schema
export const deleteNetworkSchema = z.object({
	nwid: z.string({ invalid_type_error: "Invalid network ID provided" }),
	central: z.boolean().default(false),
	organizationId: z.string().optional(),
});

export type DeleteNetworkInputType = z.infer<typeof deleteNetworkSchema>;
