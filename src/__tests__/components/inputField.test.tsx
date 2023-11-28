import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import InputField from "~/components/elements/inputField";
import { NextIntlClientProvider } from "next-intl";
import enTranslation from "~/locales/en/common.json";

describe("InputField", () => {
	// ...existing code...

	test("renderInputs: renders form with input elements and buttons", () => {
		const fields = [
			{
				name: "testField",
				initialValue: "Initial value",
				type: "text",
				placeholder: "Test placeholder",
			},
		];

		const submitHandler = jest.fn();

		const { container } = render(
			<NextIntlClientProvider locale="en" messages={enTranslation}>
				<InputField label="Test Label" fields={fields} submitHandler={submitHandler} />
			</NextIntlClientProvider>,
		);

		// Click the edit icon to render the inputs
		fireEvent.click(screen.getByTestId("view-form"));

		// Check if the form is rendered
		const formElement = container.querySelector("form");
		expect(formElement).toBeInTheDocument();

		// Check if the input elements are rendered
		const inputElement = screen.getByPlaceholderText("Test placeholder");
		expect(inputElement).toBeInTheDocument();

		// Check if the submit button is rendered
		const submitButton = screen.getByRole("button", { name: /submit/i });
		expect(submitButton).toBeInTheDocument();

		// Check if the cancel button is rendered
		const cancelButton = screen.getByRole("button", { name: /cancel/i });
		expect(cancelButton).toBeInTheDocument();
	});
});
