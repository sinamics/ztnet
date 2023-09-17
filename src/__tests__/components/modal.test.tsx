import { render, fireEvent, screen } from "@testing-library/react";
import { useModalStore } from "~/utils/store";
import enTranslation from "~/locales/en/common.json";
import { NextIntlProvider } from "next-intl";
import Modal from "~/components/shared/modal";

jest.mock("../../utils/store", () => ({
	useModalStore: jest.fn(),
}));

describe("Modal", () => {
	const closeModal = jest.fn();
	const toggleModal = jest.fn();
	const yesAction = jest.fn();

	beforeEach(() => {
		(useModalStore as unknown as jest.Mock).mockImplementation(() => ({
			isOpen: true,
			description: "Test description",
			title: "Test title",
			yesAction,
			toggleModal,
			closeModal,
		}));
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test("renders modal with title and description", () => {
		render(
			<NextIntlProvider locale="en" messages={enTranslation}>
				<Modal />
			</NextIntlProvider>,
		);
		expect(screen.getByText("Test title")).toBeInTheDocument();
		expect(screen.getByText("Test description")).toBeInTheDocument();
	});

	test("handles yes and cancel actions", () => {
		render(
			<NextIntlProvider locale="en" messages={enTranslation}>
				<Modal />
			</NextIntlProvider>,
		);
		fireEvent.click(screen.getByText("Yes"));
		expect(yesAction).toHaveBeenCalledTimes(1);
		expect(toggleModal).toHaveBeenCalledTimes(1);

		fireEvent.click(screen.getByText("Cancel"));
		expect(closeModal).toHaveBeenCalledTimes(1);
	});
});
