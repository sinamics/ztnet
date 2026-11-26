import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import enTranslation from "~/locales/en/common.json";
import OrganizationNetworkSetting from "~/pages/organization/[orgid]/admin/network";

const updateSettings = jest.fn();

jest.mock("next/router", () => ({
	useRouter: () => ({ query: { orgid: "org1" } }),
}));

jest.mock("~/components/layouts/layout", () => ({
	LayoutOrganizationAuthenticated: ({ children }) => children,
}));

jest.mock("~/utils/api", () => ({
	api: {
		org: {
			updateOrganizationSettings: {
				useMutation: () => ({ mutate: updateSettings }),
			},
			getOrganizationSettings: {
				useQuery: () => ({
					data: { renameNodeGlobally: false, networkConfigRole: "MODERATOR" },
					refetch: jest.fn(),
				}),
			},
		},
	},
}));

describe("Organization admin network settings", () => {
	it("names the network configuration role select and saves a change", () => {
		render(
			<NextIntlClientProvider locale="en" messages={enTranslation}>
				<OrganizationNetworkSetting />
			</NextIntlClientProvider>,
		);

		const select = screen.getByRole("combobox", {
			name: "Minimum role to change network configuration",
		});
		expect(select).toHaveValue("MODERATOR");

		fireEvent.change(select, { target: { value: "ADMIN" } });
		expect(updateSettings).toHaveBeenCalledWith(
			{ organizationId: "org1", networkConfigRole: "ADMIN" },
			expect.anything(),
		);
	});
});
