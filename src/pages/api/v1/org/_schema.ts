import { z } from "zod";

// Schema for creating a new organization
export const createOrgSchema = z
	.object({
		name: z.string().min(3, "Name must be at least 3 characters").max(40),
		description: z.string().optional(),
	})
	.strict();

// Schema for adding a user to an organization
export const addUserToOrgSchema = z
	.object({
		userId: z.string(),
		role: z.enum(["READ_ONLY", "USER", "ADMIN"]).default("READ_ONLY"),
	})
	.strict();

// Schema for inviting a user by email
export const inviteUserSchema = z
	.object({
		email: z.string().email(),
		role: z.enum(["READ_ONLY", "USER", "ADMIN"]).default("READ_ONLY"),
	})
	.strict();

// Schema for updating an organization
export const updateOrgSchema = z
	.object({
		name: z.string().min(3).max(40).optional(),
		description: z.string().optional(),
	})
	.strict();
