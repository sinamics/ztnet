/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { api } from "~/utils/api";
import cn from "classnames";
import { toast } from "react-hot-toast";

export const NetworkDns = () => {
  const [state, setState] = useState({
    address: "",
    servers: new Set<string>(),
    domain: "",
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
    if (
      !networkByIdQuery.network?.dns ||
      !Array.isArray(networkByIdQuery?.network?.dns.servers)
    )
      return;
    setState((prev) => ({
      ...prev,
      domain: networkByIdQuery?.network?.dns.domain,
      servers:
        new Set([...networkByIdQuery?.network?.dns.servers]) || new Set(),
    }));
  }, [networkByIdQuery.network.dns]);

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

  const submitHandler = (e) => {
    e.preventDefault();
    // add toast notification if address or domain is empty
    if (!state.address || !state.domain) {
      return toast.error("Address and Domain is required");
    }

    updateNetwork(
      {
        nwid: network.nwid,
        updateParams: {
          dns: {
            domain: state.domain,
            address: state.address,
          },
        },
      },
      {
        onSuccess: () => {
          void refetchNetwork();
          setState({ ...state, address: "" });
        },
      }
    );
  };

  const { network } = networkByIdQuery;
  // console.log(state.servers);
  return (
    <>
      {/* <div>IPv4 assignment</div> */}
      <div className="flex py-3">
        <div>
          <p>DNS</p>
          <p className="text-xs text-gray-300">
            Requires ZeroTier version 1.6.
          </p>
        </div>
        <div className="mx-auto flex">
          {Array.from(state.servers).length > 0 ? (
            <button
              onClick={() =>
                updateNetwork(
                  {
                    nwid: network.nwid,
                    updateParams: {
                      removeDns: true,
                    },
                  },
                  {
                    onSuccess: () => {
                      void refetchNetwork();
                      setState({ ...state });
                    },
                  }
                )
              }
              className="btn btn-outline btn-warning btn-xs"
            >
              Clear DNS
            </button>
          ) : null}
        </div>
      </div>
      <div
        className={cn(
          "xs:grid-cols-2 grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-2"
        )}
      >
        <div>
          <form>
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Search Domain</span>
              </label>
              <input
                type="text"
                name="domain"
                value={state.domain}
                onChange={onChangeHandler}
                placeholder="home.arpa"
                className="input input-bordered input-sm w-full"
              />
            </div>
            <div className="form-control ">
              <label className="label">
                <span className="label-text">Server Address</span>
              </label>
              <input
                type="text"
                name="address"
                value={state.address}
                onChange={onChangeHandler}
                placeholder="10.147.20.190"
                className="input input-bordered input-sm w-full"
              />
            </div>
            <button type="submit" onClick={submitHandler} className="hidden" />
          </form>
        </div>
        <div>
          {Array.from(state.servers).length > 0 ? <p>Servers</p> : null}
          <div className="flex flex-wrap gap-3">
            {Array.from(state.servers).map((dns, idx: number) => (
              <div key={idx} className="form-control">
                <span className="text-md badge badge-ghost label-text badge-lg  rounded-md opacity-80">
                  {dns}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
