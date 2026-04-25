import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LoginPage from "~/pages/auth/login";
import enTranslation from "~/locales/en/common.json";
import { api } from "../../../utils/api";
import { ErrorCode } from "~/utils/errorCode";
import * as reactHotToast from "react-hot-toast";

const mockSignInEmail = jest.fn();
const mockSignInSocial = jest.fn();

jest.mock("~/lib/authClient", () => ({
	authClient: {
		signIn: {
			email: (...args) => mockSignInEmail(...args),
			social: (...args) => mockSignInSocial(...args),
		},
	},
	signIn: {
		social: (...args) => mockSignInSocial(...args),
	},
}));
jest.mock("~/server/db", () => ({
	prisma: {},
}));
jest.mock("next/router", () => ({
	useRouter: jest.fn().mockReturnValue({
		query: {},
	}),
}));
// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
	toast: {
		error: jest.fn(),
		success: jest.fn(),
	},
}));
jest.mock("../../../utils/api", () => ({
	api: {
		public: {
			getWelcomeMessage: {
				useQuery: jest.fn(),
			},
			registrationAllowed: {
				useQuery: jest.fn().mockReturnValue({
					data: { enableRegistration: true, oauthExclusiveLogin: false },
					isLoading: false,
				}),
			},
		},
		settings: {
			getAllOptions: {
				useQuery: () => ({
					data: {},
					isLoading: false,
					refetch: jest.fn(),
				}),
			},
			getPublicOptions: {
				useQuery: () => ({
					data: {},
					isLoading: false,
					refetch: jest.fn(),
				}),
			},
		},
		network: {
			getUserNetworks: {
				useQuery: jest.fn(),
			},
			createNetwork: {
				useMutation: () => ({
					mutate: jest.fn(),
				}),
			},
		},
	},
}));

describe("LoginPage", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient();
		mockSignInEmail.mockReset();
		mockSignInSocial.mockReset();
		jest.clearAllMocks();
	});

	const renderLoginPage = () => {
		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<LoginPage oauthExclusiveLogin={false} oauthEnabled={true} />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);
	};

	it("renders login form correctly", async () => {
		const useQueryMock = jest.fn().mockReturnValue({
			data: null,
			isLoading: true,
			refetch: jest.fn(),
		});
		api.public.getWelcomeMessage.useQuery = useQueryMock;

		await act(async () => {
			renderLoginPage();
		});

		expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /^Sign in$/i })).toBeInTheDocument();
	});

	it("handles form submission with valid credentials", async () => {
		mockSignInEmail.mockResolvedValue({
			data: { user: {}, session: {} },
			error: null,
		});

		renderLoginPage();

		const emailInput = screen.getByLabelText(/Email/i);
		const passwordInput = screen.getByLabelText(/Password/i);
		const submitButton = screen.getByRole("button", { name: /^Sign in$/i });

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.type(passwordInput, "password123");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(mockSignInEmail).toHaveBeenCalledWith(
				expect.objectContaining({
					email: "test@example.com",
					password: "password123",
				}),
			);
		});
	});

	it("displays error toast for invalid credentials", async () => {
		mockSignInEmail.mockResolvedValue({
			data: null,
			error: { message: ErrorCode.IncorrectUsernamePassword },
		});
		renderLoginPage();

		const emailInput = screen.getByLabelText(/Email/i);
		const passwordInput = screen.getByLabelText(/Password/i);
		const submitButton = screen.getByRole("button", { name: /^Sign in$/i });

		await userEvent.type(emailInput, "invalid@example.com");
		await userEvent.type(passwordInput, "wrongpassword");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(reactHotToast.toast.error).toHaveBeenCalledWith(
				"Invalid email or password. Please check your credentials and try again.",
				{
					duration: 10000,
				},
			);
		});
	});

	it("requires password input", async () => {
		mockSignInEmail.mockResolvedValue({
			data: null,
			error: { message: ErrorCode.IncorrectUsernamePassword },
		});
		renderLoginPage();

		const emailInput = screen.getByLabelText(/Email/i);
		const submitButton = screen.getByRole("button", { name: /^Sign in$/i });

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(reactHotToast.toast.error).toHaveBeenCalledWith(
				"Invalid email or password. Please check your credentials and try again.",
				{
					duration: 10000,
				},
			);
		});
	});

	it("handles OAuth sign-in via signIn.social (preserves legacy callback URL)", async () => {
		// We use `signIn.social` (not `signIn.oauth2`) so the IdP callback URL
		// stays at `/api/auth/callback/oauth` — the URL documented at
		// https://ztnet.network/authentication/oauth and registered in every
		// existing IdP. The genericOAuth plugin still drives the flow because
		// its init() injects the provider into `socialProviders`.
		mockSignInSocial.mockResolvedValue({
			data: { url: "https://idp.example/auth" },
			error: null,
		});

		renderLoginPage();
		await waitFor(() => screen.getByRole("button", { name: /Sign in with OAuth/i }));

		const oauthButton = screen.getByRole("button", { name: /Sign in with OAuth/i });
		await userEvent.click(oauthButton);

		expect(mockSignInSocial).toHaveBeenCalledWith(
			expect.objectContaining({
				provider: "oauth",
				callbackURL: "/network",
			}),
		);
	});

	it("surfaces OAuth errors from the better-auth client", async () => {
		mockSignInSocial.mockResolvedValue({
			data: null,
			error: { message: "Provider not found" },
		});

		renderLoginPage();
		await waitFor(() => screen.getByRole("button", { name: /Sign in with OAuth/i }));
		await userEvent.click(screen.getByRole("button", { name: /Sign in with OAuth/i }));

		await waitFor(() => {
			expect(reactHotToast.toast.error).toHaveBeenCalledWith("Provider not found", {
				duration: 10000,
			});
		});
	});

	it("Enter 2FA code", async () => {
		mockSignInEmail.mockResolvedValue({
			data: null,
			error: { message: ErrorCode.SecondFactorRequired },
		});
		renderLoginPage();

		const emailInput = screen.getByLabelText(/Email/i);
		const passwordInput = screen.getByLabelText(/Password/i);
		const submitButton = screen.getByRole("button", { name: /^Sign in$/i });

		await userEvent.type(emailInput, "invalid@example.com");
		await userEvent.type(passwordInput, "password");
		await userEvent.click(submitButton);

		// check that "TOTP Code" text is displayed
		expect(screen.getByText(/Enter 2FA Code/i)).toBeInTheDocument();

		// make sure input with test-id="totp-input" is displayed, and there is 6 of them
		const totpCodeInputs = screen.getAllByTestId("totp-input-digit");
		expect(totpCodeInputs).toHaveLength(6);

		// check if the wrong code is entered 6 times and the error message is displayed
		for (let i = 0; i < 5; i++) {
			await userEvent.type(totpCodeInputs[i], "1");
		}

		// make sure error text is shown
		await waitFor(() => {
			expect(screen.getByText(/Code must be exactly 6 digits/i)).toBeInTheDocument();
		});
	});
});
