import { render } from "@testing-library/react";
import { useRouter } from "next/router";
import LocaleRedirect from "~/pages/locale-redirect";

jest.mock("next/router", () => ({
	useRouter: jest.fn(),
}));

const renderWithQuery = (
	query: Record<string, string | string[]>,
	language = "en-US",
) => {
	const replace = jest.fn();
	(useRouter as jest.Mock).mockReturnValue({ isReady: true, query, replace });
	jest.spyOn(window.navigator, "language", "get").mockReturnValue(language);
	render(<LocaleRedirect />);
	return replace;
};

describe("LocaleRedirect", () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("redirects invitations to the register page by default", () => {
		const replace = renderWithQuery({ invite: "abc" });
		expect(replace).toHaveBeenCalledWith("/auth/register?invite=abc");
	});

	it("prefixes the preferred locale", () => {
		const replace = renderWithQuery({ organizationInvite: "abc" }, "nb-NO");
		expect(replace).toHaveBeenCalledWith("/no/auth/register?organizationInvite=abc");
	});

	it("keeps an internal target and merges the remaining parameters", () => {
		const replace = renderWithQuery({ target: "/auth/login?a=1#top", invite: "abc" });
		expect(replace).toHaveBeenCalledWith("/auth/login?a=1&invite=abc#top");
	});

	it.each([
		"https://evil.example",
		"//evil.example",
		"/\\evil.example",
		"/\t/evil.example",
		"/\n/evil.example",
		"/.//evil.example",
	])("ignores the external target %p", (target) => {
		const replace = renderWithQuery({ target, invite: "abc" });
		expect(replace).toHaveBeenCalledWith("/auth/register?invite=abc");
	});
});
