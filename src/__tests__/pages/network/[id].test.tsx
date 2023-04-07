import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import NetworkById from "~/pages/network/[id]";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/router";
import { prisma } from "~/server/db";
import { type network as Network } from "@prisma/client";
import { api } from "../../../utils/api";

// function createTestContext(network?: Network) {
//   return {
//     db: prisma,
//     prisma,
//     network: network || null,
//   };
// }
const MockValues = {
  api: {
    network: {
      getNetworkById: {
        useQuery: () => ({
          data: {
            network: {
              nwid: "1234567890",
              name: "Test Network",
              private: true,
              ipAssignmentPools: [
                { ipRangeStart: "10.0.0.1", ipRangeEnd: "10.0.0.254" },
              ],
              routes: [{ target: "10.0.0.0/24" }],
            },
            members: [],
          },
          isLoading: false,
          refetch: jest.fn(),
        }),
      },
      updateNetwork: {
        useMutation: () => ({
          mutate: jest.fn(),
        }),
      },
    },
    networkMember: {
      UpdateDatabaseOnly: {
        useMutation: () => ({
          mutate: jest.fn(),
        }),
      },
    },
  },
};
jest.mock("../../../utils/api", () => ({
  api: {
    network: {
      getNetworkById: {
        useQuery: () => ({
          data: {
            network: {
              nwid: "1234567890",
              name: "Test Network",
              private: true,
              ipAssignmentPools: [
                { ipRangeStart: "10.0.0.1", ipRangeEnd: "10.0.0.254" },
              ],
              routes: [{ target: "10.0.0.0/24" }],
            },
            members: [],
          },
          isLoading: false,
          refetch: jest.fn(),
        }),
      },
      updateNetwork: {
        useMutation: () => ({
          mutate: jest.fn(),
        }),
      },
    },
    networkMember: {
      UpdateDatabaseOnly: {
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
describe("NetworkById component", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_NODE_ENV = "test";
  });

  beforeEach(() => {
    (useRouter as jest.Mock).mockImplementation(() => ({
      query: {
        id: "test-id",
      },
    }));
  });
  it("renders loading element when data is being fetched", () => {
    const useQueryMock = jest.fn().mockReturnValue({
      data: null,
      isLoading: true,
      refetch: jest.fn(),
    });
    api.network.getNetworkById.useQuery = useQueryMock;

    render(<NetworkById />);

    // expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders network details correctly", () => {
    const useQueryMock = jest.fn().mockReturnValue({
      data: {
        network: {
          nwid: "1234567890",
          name: "Test Network",
          private: true,
          ipAssignmentPools: [
            { ipRangeStart: "10.0.0.1", ipRangeEnd: "10.0.0.254" },
          ],
          routes: [{ target: "10.0.0.0/24" }],
        },
        members: [],
      },
      isLoading: false,
      refetch: jest.fn(),
    });
    api.network.getNetworkById.useQuery = useQueryMock;

    render(<NetworkById />);
    // await waitForElementToBeRemoved(() => screen.queryByText(/loading/i));

    expect(screen.getByText(/Network ID:/i)).toBeInTheDocument();
    expect(screen.getByText(/Network Name:/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Network/i)).toBeInTheDocument();
    expect(screen.getByText("Network is")).toBeInTheDocument();
  });

  test("renders Network Settings divider", () => {
    render(<NetworkById />);
    expect(screen.getByText(/Network Settings/i)).toBeInTheDocument();
  });

  test("renders Network Members divider", () => {
    render(<NetworkById />);
    expect(screen.getByText(/Network Members/i)).toBeInTheDocument();
  });

  test("renders Network Start, Network End, and Network Cidr labels", () => {
    render(<NetworkById />);
    expect(screen.getByText(/Network Start:/i)).toBeInTheDocument();
    expect(screen.getByText(/Network End:/i)).toBeInTheDocument();
    expect(screen.getByText(/Network Cidr:/i)).toBeInTheDocument();
  });

  test("renders warning message", () => {
    render(<NetworkById />);
    expect(
      screen.getByText(
        /Join this network ID and the device will automatically be displayed/
      )
    ).toBeInTheDocument();
  });

  test("edit network name", async () => {
    // screen.debug();
    render(<NetworkById />);
    const editIcon = screen.getByTestId("changeNetworkName");
    await userEvent.click(editIcon);

    const input: HTMLInputElement = screen.getByPlaceholderText("Test Network");

    await userEvent.type(input, "New Network Name");
    expect(input).toHaveValue("Test NetworkNew Network Name");
    fireEvent.submit(input);
    // hack to hide the input by toggle the edit icon
    await userEvent.click(editIcon);

    await waitFor(() => expect(input).not.toBeInTheDocument());
  });
});
