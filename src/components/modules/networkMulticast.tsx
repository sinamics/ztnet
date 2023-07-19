import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import { type ErrorData } from "~/types/errorHandling";

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
    onError: (e) => {
      if ((e?.data as ErrorData)?.zodError?.fieldErrors) {
        void toast.error(
          (e?.data as ErrorData)?.zodError?.fieldErrors?.updateParams
        );
      } else {
        void toast.error(e?.message);
      }
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
    <div
      tabIndex={0}
      className="collapse-arrow collapse w-full border border-base-300 bg-base-200"
    >
      <input type="checkbox" />
      <div className="collapse-title">Multicast</div>
      <div className="collapse-content" style={{ width: "100%" }}>
        <div>
          <form className="flex justify-between">
            <div className="form-control ">
              <label className="label">
                <span className="label-text">Multicast Recipient Limit</span>
              </label>
              <div className="join">
                <input
                  name="multicastLimit"
                  value={state.multicastLimit}
                  onChange={onChangeHandler}
                  className="input join-item input-sm  w-full"
                  placeholder="Number"
                  type="number"
                />
                <button
                  type="submit"
                  onClick={submitHandler}
                  className="btn join-item btn-sm bg-base-300 text-secondary-content"
                >
                  Submit
                </button>
              </div>
            </div>
            {/* <div className="form-control">
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
            </div> */}
            <div className="form-control">
              <label>
                <span className="label-text text-xs">Enable Broadcast</span>
              </label>
              <input
                type="checkbox"
                name="enableBroadcast"
                checked={state.enableBroadcast}
                className="checkbox-primary checkbox checkbox-sm"
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
    </div>
  );
};
