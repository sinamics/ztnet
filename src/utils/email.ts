/**
 * Normalize an email address for storage and lookup.
 *
 * better-auth lowercases the email on both sign-up and sign-in before querying
 * (`internalAdapter.findUserByEmail` does `email.toLowerCase()`), and Postgres
 * string equality is case sensitive. Any address stored with an uppercase
 * character is therefore unreachable at login, so every write and every lookup
 * has to agree on the same normalized form.
 */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();
