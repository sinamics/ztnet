// Placeholder origin used only to parse relative paths. It never ends up in the result.
const PARSE_ORIGIN = "http://internal.invalid";

// Backslashes are treated as forward slashes by browsers, and ASCII control
// characters (tab, newline, ...) are stripped before a URL is parsed. Both can turn
// a value that looks like a path into a protocol-relative URL ("/\t/host" -> "//host").
// biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are what we reject
const UNSAFE_PATH_CHARS = /[\\\u0000-\u001f\u007f]/;

/**
 * Returns `value` as a same-origin path (pathname + search + hash) when it is safe
 * to hand to the router or `window.location`, otherwise returns `fallback`.
 *
 * Only absolute paths on the current origin are accepted. Anything that a browser
 * could resolve to another origin is rejected: URLs with a scheme, protocol-relative
 * URLs, backslash and control-character tricks, and dot segments that normalize to
 * a leading "//".
 */
export const safeInternalPath = (value: unknown, fallback: string): string => {
	if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
		return fallback;
	}
	if (UNSAFE_PATH_CHARS.test(value)) {
		return fallback;
	}

	let url: URL;
	try {
		url = new URL(value, PARSE_ORIGIN);
	} catch {
		return fallback;
	}

	// The normalized pathname is what the browser will navigate to, so check that
	// as well: "/.//host" normalizes to "//host".
	if (url.origin !== PARSE_ORIGIN || url.pathname.startsWith("//")) {
		return fallback;
	}

	return `${url.pathname}${url.search}${url.hash}`;
};
