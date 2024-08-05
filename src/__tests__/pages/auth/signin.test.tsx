import { render, screen, waitFor } from "@testing-library/react";
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

	const renderLoginPage = ({ hasOauth = false }) => {
		render(
			<QueryClientProvider client={queryClient}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<LoginPage hasOauth={hasOauth} oauthExlusiveLogin={false} />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);
	};

	it("renders login form correctly", () => {
		const useQueryMock = jest.fn().mockReturnValue({
			data: null,
			isLoading: true,
			refetch: jest.fn(),
		});
		api.public.getWelcomeMessage.useQuery = useQueryMock;
		renderLoginPage({ hasOauth: false });

		expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Sign in/i })).toBeInTheDocument();
	});

	it("handles form submission with valid credentials", async () => {
		const signInResponse = { ok: true, error: null };
		(signIn as jest.Mock).mockResolvedValueOnce(signInResponse);

		renderLoginPage({ hasOauth: false });

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
			error: ErrorCode.IncorrectPassword,
		});
		renderLoginPage({ hasOauth: false });

		const emailInput = screen.getByLabelText(/Email/i);
		const passwordInput = screen.getByLabelText(/Password/i);
		const submitButton = screen.getByRole("button", { name: /Sign in/i });

		await userEvent.type(emailInput, "invalid@example.com");
		await userEvent.type(passwordInput, "wrongpassword");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(reactHotToast.toast.error).toHaveBeenCalledWith(
				ErrorCode.IncorrectPassword,
				{
					duration: 10000,
				},
			);
		});
	});

	// it("validates email format", async () => {
	// 	renderLoginPage();

	// 	const emailInput = screen.getByLabelText(/Email/i);
	// 	const submitButton = screen.getByRole("button", { name: /Sign in/i });

	// 	await userEvent.type(emailInput, "invalidemail");
	// 	await userEvent.click(submitButton);

	// 	await waitFor(() => {
	// 		expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
	// 	});
	// });

	it("requires password input", async () => {
		(signIn as jest.Mock).mockResolvedValue({
			error: "email or password is wrong!",
		});
		renderLoginPage({ hasOauth: false });

		const emailInput = screen.getByLabelText(/Email/i);
		const submitButton = screen.getByRole("button", { name: /Sign in/i });

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(reactHotToast.toast.error).toHaveBeenCalledWith(
				"email or password is wrong!",
				{
					duration: 10000,
				},
			);
		});
	});

	it("handles OAuth sign-in", async () => {
		renderLoginPage({ hasOauth: true });

		const oauthButton = screen.getByRole("button", { name: /Sign in with OAuth/i });
		await userEvent.click(oauthButton);

		expect(signIn).toHaveBeenCalledWith("oauth");
	});

	it("Enter 2FA code", async () => {
		(signIn as jest.Mock).mockResolvedValue({
			error: ErrorCode.SecondFactorRequired,
		});
		renderLoginPage({ hasOauth: false });

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
