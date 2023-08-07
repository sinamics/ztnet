// LoginForm.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import LoginForm from "~/components/modules/loginForm";

jest.mock("next-auth/react", () => ({
	signIn: jest.fn(),
}));

jest.mock("next/router", () => ({
	useRouter: jest.fn(),
	push: jest.fn(),
}));

describe("LoginForm", () => {
	beforeEach(() => {
		(signIn as jest.Mock).mockReset();
		(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
	});

	it("renders the LoginForm component", () => {
		render(<LoginForm />);
		expect(
			screen.getByRole("heading", { name: /Sign In/i }),
		).toBeInTheDocument();
	});

	it("updates email and password inputs on change", () => {
		render(<LoginForm />);

		const emailInput = screen.getByPlaceholderText("mail@example.com");
		const passwordInput = screen.getByPlaceholderText("Enter your password");

		fireEvent.change(emailInput, { target: { value: "test@example.com" } });
		fireEvent.change(passwordInput, { target: { value: "testpassword" } });

		expect(emailInput).toHaveValue("test@example.com");
		expect(passwordInput).toHaveValue("testpassword");
	});

	it("submits the form with correct email and password", async () => {
		render(<LoginForm />);

		(signIn as jest.Mock).mockResolvedValue({});

		const emailInput = screen.getByPlaceholderText("mail@example.com");
		const passwordInput = screen.getByPlaceholderText("Enter your password");
		const submitButton = screen.getByText("Sign in");

		await userEvent.type(emailInput, "test@example.com");
		await userEvent.type(passwordInput, "testpassword");
		await userEvent.click(submitButton);

		expect(signIn).toHaveBeenCalledWith("credentials", {
			redirect: false,
			email: "test@example.com",
			password: "testpassword",
		});
	});
});
