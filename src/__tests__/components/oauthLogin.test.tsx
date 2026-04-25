import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { toast } from "react-hot-toast";
import OAuthLogin from "~/components/auth/oauthLogin";
import enTranslation from "~/locales/en/common.json";

const mockSignInOAuth2 = jest.fn();

jest.mock("~/lib/authClient", () => ({
	authClient: {
		signIn: {
			oauth2: (...args: unknown[]) => mockSignInOAuth2(...args),
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
		mockSignInOAuth2.mockReset();
		(toast.error as jest.Mock).mockReset();
	});

	it("returns null when oauthEnabled is false", () => {
		const { container } = renderWithIntl(<OAuthLogin oauthEnabled={false} />);
		expect(container.firstChild).toBeNull();
	});

	it("calls authClient.signIn.oauth2 with providerId 'oauth'", async () => {
		// Regression guard: under the better-auth migration this MUST be
		// `signIn.oauth2({ providerId: ... })`. Using `signIn.social({ provider })`
		// (the next-auth shape) silently 404s the genericOAuth plugin route.
		mockSignInOAuth2.mockResolvedValue({
			data: { url: "https://idp.example/authorize" },
			error: null,
		});

		renderWithIntl(<OAuthLogin oauthEnabled={true} />);
		await userEvent.click(screen.getByRole("button"));

		expect(mockSignInOAuth2).toHaveBeenCalledTimes(1);
		expect(mockSignInOAuth2).toHaveBeenCalledWith(
			expect.objectContaining({
				providerId: "oauth",
				callbackURL: "/network",
			}),
		);
		expect(mockSignInOAuth2).not.toHaveBeenCalledWith(
			expect.objectContaining({ provider: expect.anything() }),
		);
	});

	it("surfaces an error returned by signIn.oauth2", async () => {
		mockSignInOAuth2.mockResolvedValue({
			data: null,
			error: { message: "Provider config not found" },
		});

		renderWithIntl(<OAuthLogin oauthEnabled={true} />);
		await userEvent.click(screen.getByRole("button"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Provider config not found", {
				duration: 10000,
			});
		});
	});

	it("falls back to a generic message when signIn.oauth2 throws", async () => {
		mockSignInOAuth2.mockRejectedValue(new Error("network down"));

		renderWithIntl(<OAuthLogin oauthEnabled={true} />);
		await userEvent.click(screen.getByRole("button"));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Unexpected error occurred", {
				duration: 10000,
			});
		});
	});
});
