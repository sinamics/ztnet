import "../__mocks__/networkById";
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NetworkMulticast } from '~/components/modules/networkMulticast';
import { useRouter } from 'next/router';
import { api } from '~/utils/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlProvider } from 'next-intl';
import enTranslation from "~/locales/en/common.json";

// Mocking the next/router module
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

describe('<NetworkMulticast />', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    (useRouter as jest.Mock).mockImplementation(() => ({
      query: {
        id: "test-id",
      },
    }));
  });

  it('sends the correct multicastLimit to the server when submitted', async () => {
    const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
    mockUseRouter.mockReturnValue({
      query: { id: 'test-id' },
    } as any);

    const mockMutation = jest.fn();

    const useQueryMock = jest.fn().mockReturnValue({
      data: {
        network: {
          nwid: 'test-id',
          multicastLimit: 5,
          enableBroadcast: false,
        },
      },
      isLoading: false,
      refetch: jest.fn(),
    });

    api.network.getNetworkById.useQuery = useQueryMock;
    api.network.multiCast.useMutation = jest.fn().mockReturnValue({
      mutate: mockMutation,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <NextIntlProvider locale="en" messages={enTranslation}>
          <NetworkMulticast />
        </NextIntlProvider>
      </QueryClientProvider>,
    );

    // Simulate typing in the multicastLimit
    const multicastLimitInput = screen.getByPlaceholderText('Number');
    fireEvent.change(multicastLimitInput, { target: { value: '10' } });

    const submitButton = screen.getByText('Submit');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          central: false,
          nwid: 'test-id',
          updateParams: {
            multicastLimit: 10,
          },
        }),
        expect.anything()
      );
    });
  });

  it('toggles enableBroadcast correctly', async () => {
    // ... Most of the mocking stays the same ...
    const mockMutation = jest.fn();

    const useQueryMock = jest.fn().mockReturnValue({
      data: {
        network: {
          nwid: 'test-id',
          multicastLimit: 5,
          enableBroadcast: false,
        },
      },
      isLoading: false,
      refetch: jest.fn(),
    });

    api.network.getNetworkById.useQuery = useQueryMock;
    api.network.multiCast.useMutation = jest.fn().mockReturnValue({
      mutate: mockMutation,
    });
    render(
      <QueryClientProvider client={queryClient}>
        <NextIntlProvider locale="en" messages={enTranslation}>
          <NetworkMulticast />
        </NextIntlProvider>
      </QueryClientProvider>,
    );

    const enableBroadcastCheckbox = screen.getByLabelText('Enable Broadcast');
    fireEvent.click(enableBroadcastCheckbox);

    await waitFor(() => {
      expect(mockMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          central: false,
          nwid: 'test-id',
          updateParams: {
            enableBroadcast: true,
          },
        }),
        expect.anything()
      );
    });
  });
});
