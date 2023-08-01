import React from "react";
import { render, screen } from "@testing-library/react";
import { useRouter } from "next/router";
import userEvent from "@testing-library/user-event";
import { api } from "../../../utils/api";
import Networks from "~/pages/network";
import { NextIntlProvider } from "next-intl";
import enTranslation from "~/locales/en/common.json";

jest.mock("../../../utils/api", () => ({
  api: {
    network: {
      getUserNetworks: {
        useQuery: jest.fn(),
      },
      createNetwork: {
        useMutation: () => ({
          mutate: jest.fn(),
        }),
      },
    },
  },
}));

jest.mock("next/router", () => ({
  useRouter: jest.fn(),
}));

describe("Networks page", () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockImplementation(() => ({
      query: {
        id: "test-id",
      },
    }));
  });

  it("displays loading when fetching networks", () => {
    (api.network.getUserNetworks.useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
    });
    render(
      <NextIntlProvider locale="en" messages={enTranslation}>
        <Networks />
      </NextIntlProvider>
    );
    expect(screen.getByText("Loading")).toBeInTheDocument();
  });

  it("displays networks and handles add network button", async () => {
    const mockRefetch = jest.fn();
    // const mockCreateNetwork = jest.fn().mockResolvedValue({});
    const mockReturn = jest.fn().mockReturnValue({
      data: [
        { nwid: "1", name: "Network 1" },
        { nwid: "2", name: "Network 2" },
      ],
      isLoading: false,
      refetch: mockRefetch,
    });

    api.network.getUserNetworks.useQuery = mockReturn;

    // (api.network.createNetwork.useMutation as jest.Mock).mockReturnValue({
    //   createNetwork: {
    //     useMutation: () => ({
    //       mutate: mockCreateNetwork,
    //     }),
    //   },
    // });

    render(
      <NextIntlProvider locale="en" messages={enTranslation}>
        <Networks />
      </NextIntlProvider>
    );

    expect(screen.getByText("Network 1")).toBeInTheDocument();
    expect(screen.getByText("Network 2")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Create a network"));

    // await waitFor(() => {
    //   expect(mockCreateNetwork).toHaveBeenCalledTimes(1);
    // });
    // expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
