import "../__mocks__/networkById";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import enTranslation from "~/locales/en/common.json";
import { DeletedNetworkMembersTable } from "~/components/networkByIdPage/table/members/DeletedMembersTable";

jest.mock("next/router", () => ({
	useRouter: jest.fn(),
}));

const mockCallModal = jest.fn();
jest.mock("~/utils/store", () => ({
	useModalStore: (selector: (s: { callModal: jest.Mock }) => unknown) =>
		selector({ callModal: mockCallModal }),
}));

const member = (id: string, name: string) => ({
	id,
	name,
	nwid: "nwid-1",
	authorized: false,
	creationTime: new Date("2026-01-01T00:00:00Z"),
});

describe("<DeletedNetworkMembersTable />", () => {
	const updateUser = jest.fn();
	const deleteMember = jest.fn();
	const bulkDeleteStashed = jest.fn();

	const renderTable = (props: { permanentlyDeleted?: boolean }) =>
		render(
			<QueryClientProvider client={new QueryClient()}>
				<NextIntlClientProvider locale="en" messages={enTranslation}>
					<DeletedNetworkMembersTable nwid="nwid-1" organizationId="org-1" {...props} />
				</NextIntlClientProvider>
			</QueryClientProvider>,
		);

	beforeEach(() => {
		jest.clearAllMocks();
		(useRouter as jest.Mock).mockReturnValue({ query: { id: "nwid-1" } });
		api.useUtils = jest.fn().mockReturnValue({
			network: {
				getNetworkById: { invalidate: jest.fn() },
				getNetworkMembers: { invalidate: jest.fn() },
			},
		});
		api.network.getNetworkById.useQuery = jest.fn().mockReturnValue({
			data: {
				zombieMembers: [member("stashed01", "Stashed node")],
				permanentlyDeletedMembers: [member("deleted01", "Deleted node")],
			},
			refetch: jest.fn(),
		});
		api.networkMember.UpdateDatabaseOnly.useMutation = jest
			.fn()
			.mockReturnValue({ mutate: updateUser });
		api.networkMember.delete.useMutation = jest
			.fn()
			.mockReturnValue({ mutate: deleteMember });
		// biome-ignore lint/suspicious/noExplicitAny: not part of the shared mock
		(api.networkMember as any).bulkDeleteStashed = {
			useMutation: jest.fn().mockReturnValue({ mutate: bulkDeleteStashed }),
		};
	});

	it("lists permanently deleted members and re-activates with deleted: false only", () => {
		renderTable({ permanentlyDeleted: true });

		expect(screen.getByText("deleted01")).toBeInTheDocument();
		expect(screen.queryByText("stashed01")).not.toBeInTheDocument();
		expect(screen.queryByText("Force Delete")).not.toBeInTheDocument();
		expect(screen.queryByText(/Delete All Stashed/)).not.toBeInTheDocument();

		const row = screen.getByText("deleted01").closest("tr") as HTMLElement;
		fireEvent.click(within(row).getByRole("button", { name: "Re-Activate" }));

		expect(updateUser).toHaveBeenCalledTimes(1);
		expect(updateUser).toHaveBeenCalledWith({
			nwid: "nwid-1",
			id: "deleted01",
			organizationId: "org-1",
			updateParams: { deleted: false },
		});
	});

	it("keeps the stashed table and describes Force Delete as reversible", () => {
		renderTable({});

		expect(screen.getByText("stashed01")).toBeInTheDocument();
		expect(screen.queryByText("deleted01")).not.toBeInTheDocument();
		expect(screen.getByText(/Delete All Stashed \(1\)/)).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Force Delete" }));
		expect(mockCallModal).toHaveBeenCalledTimes(1);
		const { description } = mockCallModal.mock.calls[0][0];
		const { container } = render(description);
		expect(container.textContent).toContain(
			"can re-activate it later from the permanently deleted members list",
		);
		expect(container.textContent).not.toContain("removed from the database");
	});
});
