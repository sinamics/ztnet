import { z } from "zod";

export const networkInputSchema = z.object({
	nwid: z.string(),
	central: z.boolean().optional().default(false),
});

export type NetworkInput = z.infer<typeof networkInputSchema>;
