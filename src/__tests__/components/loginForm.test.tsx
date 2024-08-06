import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import CredentialsForm from "~/components/auth/credentialsForm";
import { ErrorCode } from "~/utils/errorCode";

jest.mock("next-auth/react", () => ({
	signIn: jest.fn(),
}));

jest.mock("next/router", () => ({
	useRouter: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
	toast: {
		error: jest.fn(),
	},
}));

describe("CredentialsForm", () => {
	beforeEach(() => {
		(signIn as jest.Mock).mockReset();
		(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
		(toast.error as jest.Mock).mockReset();
	});

	it("updates email and password inputs on change", () => {
		render(<CredentialsForm />);

		const emailInput = screen.getByPlaceholderText("mail@example.com");
		const passwordInput = screen.getByPlaceholderText("Enter your password");

		fireEvent.change(emailInput, { target: { value: "test@example.com" } });
		fireEvent.change(passwordInput, { target: { value: "testpassword" } });

		expect(emailInput).toHaveValue("test@example.com");
		expect(passwordInput).toHaveValue("testpassword");
	});

	it("submits the form with correct email and password", async () => {
		render(<CredentialsForm />);

		(signIn as jest.Mock).mockResolvedValue({ ok: true });

		const emailInput = screen.getByPlaceholderText("mail@example.com");
		const passwordInput = screen.getByPlaceholderText("Enter your password");
		const submitButton = screen.getByRole("button", { name: /sign in/i });

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.type(passwordInput, "testpassword");
		await userEvent.click(submitButton);

		expect(signIn).toHaveBeenCalledWith("credentials", {
			redirect: false,
			email: "test@example.com",
			password: "testpassword",
			totpCode: "",
		});
	});

	it("shows TOTP input when second factor is required", async () => {
		render(<CredentialsForm />);

		(signIn as jest.Mock).mockResolvedValue({ error: ErrorCode.SecondFactorRequired });

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
		render(<CredentialsForm />);

		const errorMessage = "Invalid credentials";
		(signIn as jest.Mock).mockResolvedValue({ ok: false, error: errorMessage });

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

		render(<CredentialsForm />);

		(signIn as jest.Mock).mockResolvedValue({ ok: true });

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
		render(<CredentialsForm />);

		const errorMessage = "Network error";
		(signIn as jest.Mock).mockRejectedValue(new Error(errorMessage));

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
