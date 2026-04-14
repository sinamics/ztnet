import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import CredentialsForm from "~/components/auth/credentialsForm";
import { ErrorCode } from "~/utils/errorCode";
import enTranslation from "~/locales/en/common.json";

const mockSignInEmail = jest.fn();

jest.mock("~/lib/authClient", () => ({
	authClient: {
		signIn: {
			email: (...args) => mockSignInEmail(...args),
		},
	},
}));

jest.mock("next/router", () => ({
	useRouter: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
	toast: {
		error: jest.fn(),
	},
}));

const renderWithIntl = (ui, { locale = "en", messages = enTranslation } = {}) => {
	return render(
		<NextIntlClientProvider locale={locale} messages={messages}>
			{ui}
		</NextIntlClientProvider>,
	);
};

describe("CredentialsForm", () => {
	beforeEach(() => {
		mockSignInEmail.mockReset();
		(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
		(toast.error as jest.Mock).mockReset();
	});

	it("updates email and password inputs on change", () => {
		renderWithIntl(<CredentialsForm />);

		const emailInput = screen.getByPlaceholderText("mail@example.com");
		const passwordInput = screen.getByPlaceholderText("Enter your password");

		fireEvent.change(emailInput, { target: { value: "test@example.com" } });
		fireEvent.change(passwordInput, { target: { value: "testpassword" } });

		expect(emailInput).toHaveValue("test@example.com");
		expect(passwordInput).toHaveValue("testpassword");
	});

	it("submits the form with correct email and password", async () => {
		renderWithIntl(<CredentialsForm />);

		mockSignInEmail.mockResolvedValue({ data: { user: {}, session: {} }, error: null });

		const emailInput = screen.getByPlaceholderText("mail@example.com");
		const passwordInput = screen.getByPlaceholderText("Enter your password");
		const submitButton = screen.getByRole("button", { name: /sign in/i });

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.type(passwordInput, "testpassword");
		await userEvent.click(submitButton);

		expect(mockSignInEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "test@example.com",
				password: "testpassword",
			}),
		);
	});

	it("shows TOTP input when second factor is required", async () => {
		renderWithIntl(<CredentialsForm />);

		mockSignInEmail.mockResolvedValue({
			data: null,
			error: { message: ErrorCode.SecondFactorRequired },
		});

		const emailInput = screen.getByPlaceholderText("mail@example.com");
		const passwordInput = screen.getByPlaceholderText("Enter your password");
		const submitButton = screen.getByRole("button", { name: /sign in/i });

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.type(passwordInput, "testpassword");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Enter 2FA Code")).toBeInTheDocument();
		});
	});

	it("handles error response from signIn", async () => {
		renderWithIntl(<CredentialsForm />);

		const errorMessage = "Invalid credentials";
		mockSignInEmail.mockResolvedValue({
			data: null,
			error: { message: errorMessage },
		});

		const emailInput = screen.getByPlaceholderText("mail@example.com");
		const passwordInput = screen.getByPlaceholderText("Enter your password");
		const submitButton = screen.getByRole("button", { name: /sign in/i });

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.type(passwordInput, "wrongpassword");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(errorMessage, { duration: 10000 });
		});
	});

	it("redirects to /network on successful login", async () => {
		const mockPush = jest.fn();
		(useRouter as jest.Mock).mockReturnValue({ push: mockPush });

		renderWithIntl(<CredentialsForm />);

		mockSignInEmail.mockResolvedValue({ data: { user: {}, session: {} }, error: null });

		const emailInput = screen.getByPlaceholderText("mail@example.com");
		const passwordInput = screen.getByPlaceholderText("Enter your password");
		const submitButton = screen.getByRole("button", { name: /sign in/i });

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.type(passwordInput, "testpassword");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(mockPush).toHaveBeenCalledWith("/network");
		});
	});

	it("handles network errors", async () => {
		renderWithIntl(<CredentialsForm />);

		const errorMessage = "Network error";
		mockSignInEmail.mockRejectedValue(new Error(errorMessage));

		const emailInput = screen.getByPlaceholderText("mail@example.com");
		const passwordInput = screen.getByPlaceholderText("Enter your password");
		const submitButton = screen.getByRole("button", { name: /sign in/i });

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.type(passwordInput, "testpassword");
		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(errorMessage);
		});
	});
});
