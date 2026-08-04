import { z } from "zod";
import { normalizeEmail } from "~/utils/email";

/**
 * Email input schema: normalize first, then validate the normalized value.
 *
 * Order matters. `z.string().email().transform(normalizeEmail)` runs the
 * validation before the transform, so a padded address from autofill or a
 * copy/paste (" user@example.com ") is rejected before it can ever be
 * trimmed. Piping the other way around trims and lowercases first, so the
 * value that reaches the database is always the same one better-auth will
 * later look up.
 *
 * @param invalidMessage overrides the "invalid address" message
 * @param requiredError overrides the message for a missing/non-string value
 */
export const emailSchema = (invalidMessage?: string, requiredError?: string) =>
	(requiredError ? z.string({ error: requiredError }) : z.string())
		.transform(normalizeEmail)
		.pipe(z.string().email(invalidMessage));

// This regular expression (regex) is used to validate a password based on the following criteria:
// - The password must be at least 6 characters long.
// - The password must contain at least two of the following three character types:
//  - Lowercase letters (a-z)
//  - Uppercase letters (A-Z)
//  - Digits (0-9)
export const mediumPassword =
	/^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[a-z])(?=.*[0-9]))|((?=.*[A-Z])(?=.*[0-9])))(?=.{6,})/;

// create a zod password schema
export const passwordSchema = (errorMessage: string) =>
	z
		.string()
		.max(40, { message: "Password must not exceed 40 characters" })
		.refine((val) => mediumPassword.test(val), {
			message: errorMessage,
		})
		.optional();
