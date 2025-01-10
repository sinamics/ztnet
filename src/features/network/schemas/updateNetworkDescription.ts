import { z } from "zod";

export const updateParamsSchema = z.object({
	nwid: z.string(),
	central: z.boolean().default(false),
	organizationId: z.string().optional().nullable(),
	description: z.string(),
});
