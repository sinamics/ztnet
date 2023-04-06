import { render, fireEvent, screen } from "@testing-library/react";
import Modal from "~/components/elements/modal";
import { useModalStore } from "~/utils/store";

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
    render(<Modal />);
    expect(screen.getByText("Test title")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  test("handles yes and cancel actions", () => {
    render(<Modal />);
    fireEvent.click(screen.getByText("Yes"));
    expect(yesAction).toHaveBeenCalledTimes(1);
    expect(toggleModal).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Cancle"));
    expect(closeModal).toHaveBeenCalledTimes(1);
  });
});
