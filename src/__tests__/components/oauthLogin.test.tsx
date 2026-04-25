import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { toast } from "react-hot-toast";
import OAuthLogin from "~/components/auth/oauthLogin";
import enTranslation from "~/locales/en/common.json";

const mockSignInSocial = jest.fn();

jest.mock("~/lib/authClient", () => ({
	authClient: {
		signIn: {
			social: (...args: unknown[]) => mockSignInSocial(...args),
		},
	},
}));

jest.mock("react-hot-toast", () => ({
	toast: { error: jest.fn() },
}));

const renderWithIntl = (ui: React.ReactElement) =>
	render(
		<NextIntlClientProvider locale="en" messages={enTranslation}>
			{ui}
		</NextIntlClientProvider>,
	);

describe("OAuthLogin", () => {
	beforeEach(() => {
		mockSignInSocial.mockReset();
		(toast.error as jest.Mock).mockReset();
	});

	it("returns null when oauthEnabled is false", () => {
		const { container } = renderWithIntl(<OAuthLogin oauthEnabled={false} />);
		expect(container.firstChild).toBeNull();
	});

	it("calls authClient.signIn.social with provider 'oauth'", async () => {
		// Pinned to `signIn.social` (NOT `signIn.oauth2`) so the IdP redirect URI
		// stays at `${baseURL}/api/auth/callback/oauth` — the URL ztnet has always
		// shipped in its docs and that users have registered with their IdP.
		// The genericOAuth plugin's init() injects the provider into
		// `socialProviders`, so PKCE/mapProfileToUser/discoveryUrl all still apply.
		mockSignInSocial.mockResolvedValue({
			data: { url: "https://idp.example/authorize" },
			error: null,
		});

		renderWithIntl(<OAuthLogin oauthEnabled={true} />);
		await userEvent.click(screen.getByRole("button"));

		expect(mockSignInSocial).toHaveBeenCalledTimes(1);
		expect(mockSignInSocial).toHaveBeenCalledWith(
			expect.objectContaining({
				provider: "oauth",
				callbackURL: "/network",
			}),
		);
	});

	it("surfaces an error returned by signIn.social", async () => {
		mockSignInSocial.mockResolvedValue({
			data: null,
			error: { message: "Provider not found" },
		});

		renderWithIntl(<OAuthLogin oauthEnabled={true} />);
		await userEvent.click(screen.getByRole("button"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Provider not found", {
				duration: 10000,
			});
		});
	});

	it("falls back to a generic message when signIn.social throws", async () => {
		mockSignInSocial.mockRejectedValue(new Error("network down"));

		renderWithIntl(<OAuthLogin oauthEnabled={true} />);
		await userEvent.click(screen.getByRole("button"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Unexpected error occurred", {
				duration: 10000,
			});
		});
	});
});
