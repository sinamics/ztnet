/**
 * Order matters in `emailSchema`. Zod runs validations before transforms, so
 * the natural-looking `z.string().email().transform(normalizeEmail)` rejects a
 * padded address before it can ever be trimmed — autofill and copy/paste
 * routinely produce " user@example.com ". `emailSchema` pipes the other way
 * around: normalize first, then validate the normalized value.
 *
 * It is also the single guarantee that what gets written to User.email is the
 * same string better-auth will later look up (#964), so a regression here
 * re-opens the lockout.
 */
import { emailSchema } from "~/server/api/routers/_schema";

describe("emailSchema", () => {
	it("accepts a padded address and returns it normalized", () => {
		const result = emailSchema().safeParse("  John@Example.COM  ");
		expect(result.success).toBe(true);
		expect(result.data).toBe("john@example.com");
	});

	it("lowercases without any padding", () => {
		expect(emailSchema().parse("John@Example.COM")).toBe("john@example.com");
	});

	it("still rejects a genuine non-address", () => {
		expect(emailSchema().safeParse("not-an-email").success).toBe(false);
	});

	it("rejects a string that is only whitespace", () => {
		expect(emailSchema().safeParse("   ").success).toBe(false);
	});

	it("rejects a non-string", () => {
		expect(emailSchema().safeParse(42).success).toBe(false);
		expect(emailSchema().safeParse(null).success).toBe(false);
	});

	it("preserves a custom invalid-address message", () => {
		const result = emailSchema("Valid email is required").safeParse("nope");
		expect(result.error?.issues[0]?.message).toBe("Valid email is required");
	});

	it("preserves a custom required message for a missing value", () => {
		const result = emailSchema(undefined, "Email is required!").safeParse(undefined);
		expect(result.error?.issues[0]?.message).toBe("Email is required!");
	});

	it("works under .optional() so partial updates can omit the field", () => {
		const optional = emailSchema().optional();
		expect(optional.safeParse(undefined).success).toBe(true);
		expect(optional.parse(" A@B.com ")).toBe("a@b.com");
	});

	it("is idempotent, so re-parsing an already stored value is stable", () => {
		const once = emailSchema().parse(" John@Example.com ");
		expect(emailSchema().parse(once)).toBe(once);
	});
});
