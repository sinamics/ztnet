import { z } from "zod";

// This regular expression (regex) is used to validate a password based on the following criteria:
// - The password must be at least 6 characters long.
// - The password must contain at least two of the following three character types:
//  - Lowercase letters (a-z)
//  - Uppercase letters (A-Z)
//  - Digits (0-9)
export const mediumPassword = new RegExp(
	"^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[a-z])(?=.*[0-9]))|((?=.*[A-Z])(?=.*[0-9])))(?=.{6,})",
);

// create a zod password schema
export const passwordSchema = (errorMessage: string) =>
	z
		.string()
		.max(40, { message: "Password must not exceed 40 characters" })
		.refine((val) => mediumPassword.test(val), {
			message: errorMessage,
		})
		.optional();
