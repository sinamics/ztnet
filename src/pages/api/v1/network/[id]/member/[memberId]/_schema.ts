import { z } from "zod";

// Schema for updateable fields
export const updateableFieldsSchema = z
	.object({
		name: z.object({
			type: z.literal("string"),
			destinations: z.array(z.literal("database")),
		}),
		authorized: z.object({
			type: z.literal("boolean"),
			destinations: z.array(z.literal("controller")),
		}),
	})
	.strict();

// Schema for the request body
export const updateMemberBodySchema = z.record(z.union([z.string(), z.boolean()]));

// Schema for the context passed to the handler
export const handlerContextSchema = z.object({
	body: updateMemberBodySchema,
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
