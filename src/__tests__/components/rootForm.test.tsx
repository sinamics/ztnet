import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import RootForm from "~/components/adminPage/controller/rootForm";
import enTranslation from "~/locales/en/common.json";
import { api } from "~/utils/api";

jest.mock("~/utils/api", () => ({
	api: {
		admin: {
			getPlanet: { useQuery: jest.fn() },
			getIdentity: { useQuery: jest.fn() },
			makeWorld: { useMutation: jest.fn() },
		},
	},
}));

jest.mock("~/utils/store", () => ({
	useModalStore: jest.fn((selector) => selector({ callModal: jest.fn() })),
}));

const mockedApi = api as unknown as {
	admin: {
		getPlanet: { useQuery: jest.Mock };
		getIdentity: { useQuery: jest.Mock };
		makeWorld: { useMutation: jest.Mock };
	};
};

describe("RootForm", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedApi.admin.getPlanet.useQuery.mockReturnValue({
			data: null,
			refetch: jest.fn(),
		});
		mockedApi.admin.getIdentity.useQuery.mockReturnValue({
			data: {
				ip: "203.0.113.10",
				identity:
					"992fcf1db7:0:206ed59350b31916f749a1f85dffb3a8787dcbf83b8c6e9448d4e3ea0e3369301be716c3609344a9d1533850fb4460c50af43322bcfc8e13d3301a1f1003ceb6",
			},
		});
		mockedApi.admin.makeWorld.useMutation.mockReturnValue({
			mutate: jest.fn(),
		});
	});

	it("does not force the local node into the first root when creating a planet", async () => {
		render(
			<NextIntlClientProvider locale="en" messages={enTranslation}>
				<RootForm onClose={jest.fn()} />
			</NextIntlClientProvider>,
		);

		await waitFor(() => {
			expect(screen.getByPlaceholderText("endpoints")).toHaveValue("");
		});
		expect(screen.getByPlaceholderText("identity")).toHaveValue("");
		expect(
			screen.getByRole("button", { name: "Use local node as root" }),
		).toBeInTheDocument();
	});
});
