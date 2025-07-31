import { z } from "zod";

// Schema for updateable fields metadata
export const updateableFieldsMetaSchema = z
	.object({
		name: z.string().optional(),
		description: z.string().optional(),
		authorized: z.boolean().optional(),
	})
	.strict();

// Schema for the context passed to the handler
export const handlerContextSchema = z.object({
	body: z.record(z.unknown()),
	userId: z.string(),
	networkId: z.string(),
	memberId: z.string(),
	ctx: z.object({
		prisma: z.any(),
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
		prisma: z.any(),
		session: z.object({
			user: z.object({
				id: z.string(),
			}),
		}),
	}),
});
