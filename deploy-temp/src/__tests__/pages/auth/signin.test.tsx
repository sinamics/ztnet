import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { signIn } from "next-auth/react";
import LoginPage from "~/pages/auth/login";
import enTranslation from "~/locales/en/common.json";
import { api } from "../../../utils/api";
import { ErrorCode } from "~/utils/errorCode";
import * as reactHotToast from "react-hot-toast"; // Importing the module for later use

jest.mock("next-auth/react", () => ({
	signIn: jest.fn(() => Promise.resolve({ ok: true, error: null })),
	getProviders: jest.fn(() =>
		Promise.resolve({
			oauth: {
				id: "oauth",
				name: "OAuth",
				type: "oauth",
				signinUrl: "https://provider.com/oauth",
				callbackUrl: "https://yourapp.com/api/auth/callback/oauth",
			},
		}),
	),
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
// jest.mock("~/server/db", () => ({
// 	prisma: {
// 		organization: {
// 			findMany: jest.fn(),
// 		},
// 	},
// }));
describe("LoginPage", () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient();
		(signIn as jest.Mock).mockClear();
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
		const signInResponse = { ok: true, error: null };
		(signIn as jest.Mock).mockResolvedValueOnce(signInResponse);

		renderLoginPage();

		const emailInput = screen.getByLabelText(/Email/i);
		const passwordInput = screen.getByLabelText(/Password/i);
		const submitButton = screen.getByRole("button", { name: /Sign in/i });

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.type(passwordInput, "password123");
		await userEvent.click(submitButton);

		expect(signIn).toHaveBeenCalledWith(
			"credentials",
			expect.objectContaining({
				email: "test@example.com",
				password: "password123",
				redirect: false,
				totpCode: "",
			}),
		);
		await waitFor(() => {
			expect(signIn).toHaveBeenCalled();
		});
		// // Log the response to verify it
		// const response = await signIn("credentials", {
		// 	email: "test@example.com",
		// 	password: "password123",
		// 	redirect: false,
		// 	totpCode: "",
		// });
		// console.log(response);
	});

	it("displays error toast for invalid credentials", async () => {
		(signIn as jest.Mock).mockResolvedValue({
			error: ErrorCode.IncorrectUsernamePassword,
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
		(signIn as jest.Mock).mockResolvedValue({
			error: ErrorCode.IncorrectUsernamePassword,
		});
		renderLoginPage();

		const emailInput = screen.getByLabelText(/Email/i);
		const submitButton = screen.getByRole("button", { name: /Sign in/i });

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

	it("handles OAuth sign-in", async () => {
		renderLoginPage();
		// Wait for the providers to be fetched and the button to be displayed
		await waitFor(() => screen.getByRole("button", { name: /Sign in with OAuth/i }));

		const oauthButton = screen.getByRole("button", { name: /Sign in with OAuth/i });
		await userEvent.click(oauthButton);

		expect(signIn).toHaveBeenCalledWith("oauth", { redirect: false });
	});

	it("Enter 2FA code", async () => {
		(signIn as jest.Mock).mockResolvedValue({
			error: ErrorCode.SecondFactorRequired,
		});
		renderLoginPage();

		const emailInput = screen.getByLabelText(/Email/i);
		const passwordInput = screen.getByLabelText(/Password/i);
		const submitButton = screen.getByRole("button", { name: /Sign in/i });

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
		expect(screen.getByText(/Code must be exactly 6 digits/i)).toBeInTheDocument();
	});
});
