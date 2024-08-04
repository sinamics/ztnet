import { render, fireEvent, screen } from "@testing-library/react";
import { useModalStore } from "~/utils/store";
import enTranslation from "~/locales/en/common.json";
import { NextIntlClientProvider } from "next-intl";
import Modal from "~/components/shared/modal";

jest.mock("~/utils/store", () => ({
	useModalStore: jest.fn(),
}));

jest.mock("usehooks-ts", () => ({
	useOnClickOutside: jest.fn(),
}));

// Get the mocked type
const mockedUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

describe("Modal", () => {
	const closeModal = jest.fn();
	const toggleModal = jest.fn();
	const yesAction = jest.fn();
	const callModal = jest.fn();

	beforeEach(() => {
		mockedUseModalStore.mockImplementation((selector) =>
			selector({
				isOpen: true,
				description: "Test description",
				content: <div>Test content</div>,
				title: "Test title",
				rootStyle: "",
				showButtons: true,
				yesAction,
				disableClickOutside: false,
				toggleModal,
				closeModal,
				callModal,
			}),
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test("renders modal with title, description, and content", () => {
		render(
			<NextIntlClientProvider locale="en" messages={enTranslation}>
				<Modal />
			</NextIntlClientProvider>,
		);
		expect(screen.getByText("Test title")).toBeInTheDocument();
		expect(screen.getByText("Test description")).toBeInTheDocument();
		expect(screen.getByText("Test content")).toBeInTheDocument();
	});

	test("handles yes and cancel actions", () => {
		render(
			<NextIntlClientProvider locale="en" messages={enTranslation}>
				<Modal />
			</NextIntlClientProvider>,
		);
		fireEvent.click(screen.getByText("Yes"));
		expect(yesAction).toHaveBeenCalledTimes(1);
		expect(toggleModal).toHaveBeenCalledTimes(1);

		fireEvent.click(screen.getByText("Cancel"));
		expect(closeModal).toHaveBeenCalledTimes(1);
	});

	test("renders close button when yesAction is not provided", () => {
		mockedUseModalStore.mockImplementation((selector) =>
			selector({
				isOpen: true,
				description: "Test description",
				content: <div>Test content</div>,
				title: "Test title",
				rootStyle: "",
				showButtons: true,
				yesAction: null,
				disableClickOutside: false,
				toggleModal,
				closeModal,
				callModal,
			}),
		);

		render(
			<NextIntlClientProvider locale="en" messages={enTranslation}>
				<Modal />
			</NextIntlClientProvider>,
		);

		expect(screen.getByText("Close")).toBeInTheDocument();
		fireEvent.click(screen.getByText("Close"));
		expect(closeModal).toHaveBeenCalledTimes(1);
	});

	test("does not render buttons when showButtons is false", () => {
		mockedUseModalStore.mockImplementation((selector) =>
			selector({
				isOpen: true,
				description: "Test description",
				content: <div>Test content</div>,
				title: "Test title",
				rootStyle: "",
				showButtons: false,
				yesAction,
				disableClickOutside: false,
				toggleModal,
				closeModal,
				callModal,
			}),
		);

		render(
			<NextIntlClientProvider locale="en" messages={enTranslation}>
				<Modal />
			</NextIntlClientProvider>,
		);

		expect(screen.queryByText("Yes")).not.toBeInTheDocument();
		expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
		expect(screen.queryByText("Close")).not.toBeInTheDocument();
	});
});
