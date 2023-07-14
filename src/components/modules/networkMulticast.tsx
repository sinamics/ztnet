import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";

export const NetworkMulticast = () => {
  const [state, setState] = useState({
    multicastLimit: 0,
    enableBroadcast: false,
  });

  const { query } = useRouter();
  const {
    data: networkByIdQuery,
    isLoading: loadingNetwork,
    refetch: refetchNetwork,
  } = api.network.getNetworkById.useQuery(
    {
      nwid: query.id as string,
    },
    { enabled: !!query.id }
  );

  const { mutate: updateNetwork } = api.network.updateNetwork.useMutation({
    onError: ({ message }) => {
      void toast.error(message);
    },
  });

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      multicastLimit: networkByIdQuery?.network?.multicastLimit,
      enableBroadcast: networkByIdQuery?.network?.enableBroadcast,
    }));
  }, [
    networkByIdQuery.network.multicastLimit,
    networkByIdQuery?.network?.enableBroadcast,
  ]);

  if (loadingNetwork) {
    // add loading progress bar to center of page, vertially and horizontally
    return (
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-center text-2xl font-semibold">
          <progress className="progress progress-primary w-56"></progress>
        </h1>
      </div>
    );
  }

  const onChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState({ ...state, [e.target.name]: e.target.value });
  };

  const submitHandler = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    updateNetwork(
      {
        nwid: network.nwid,
        updateParams: {
          multicast: {
            multicastLimit: state.multicastLimit.toString(),
          },
        },
      },
      {
        onSuccess: () => {
          toast.success("Multicast updated successfully");
          void refetchNetwork();
        },
      }
    );
  };

  const { network } = networkByIdQuery;
  return (
    <div>
      <p>Multicast</p>
      <div>
        <form className="flex justify-between">
          <div className="form-control">
            <label>
              <span className="label-text text-xs">
                Multicast Recipient Limit ( Hit Enter to submit )
              </span>
            </label>
            <input
              type="number"
              name="multicastLimit"
              value={state.multicastLimit}
              placeholder="Number"
              className="input input-bordered input-sm w-3/6"
              onChange={onChangeHandler}
            />
          </div>
          <div className="form-control">
            <label>
              <span className="label-text text-xs">Enable Broadcast</span>
            </label>
            <input
              type="checkbox"
              name="enableBroadcast"
              checked={state.enableBroadcast}
              className="checkbox checkbox-primary checkbox-sm"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateNetwork(
                  {
                    nwid: network.nwid,
                    updateParams: {
                      multicast: {
                        enableBroadcast: e.target.checked,
                      },
                    },
                  },
                  {
                    onSuccess: () => {
                      toast.success("Multicast updated successfully");
                      void refetchNetwork();
                    },
                  }
                )
              }
            />
          </div>
          <button type="submit" onClick={submitHandler} className="hidden" />
        </form>
      </div>
    </div>
  );
};
