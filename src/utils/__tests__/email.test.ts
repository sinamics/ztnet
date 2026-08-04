/**
 * `normalizeEmail` is the single source of truth for how an address is written
 * to and read from the database. It has to agree with better-auth, which
 * lowercases the address before every lookup
 * (`internalAdapter.findUserByEmail` → `email.toLowerCase()`). Any divergence
 * silently locks users out with "User not found", which is exactly how #964
 * happened.
 */
import { normalizeEmail } from "~/utils/email";

describe("normalizeEmail", () => {
	it("lowercases the whole address", () => {
		expect(normalizeEmail("John@Example.COM")).toBe("john@example.com");
	});

	it("trims surrounding whitespace (autofill and copy/paste add it)", () => {
		expect(normalizeEmail("  john@example.com  ")).toBe("john@example.com");
	});

	it("handles both at once", () => {
		expect(normalizeEmail("\tJohn.Doe@Example.Com \n")).toBe("john.doe@example.com");
	});

	it("leaves an already normalized address untouched", () => {
		expect(normalizeEmail("john@example.com")).toBe("john@example.com");
	});

	it("is idempotent", () => {
		const once = normalizeEmail("John@Example.COM");
		expect(normalizeEmail(once)).toBe(once);
	});
});
