/* eslint-disable @typescript-eslint/no-unsafe-call */
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import { type ErrorData } from "~/types/errorHandling";
import { useTranslations } from "next-intl";

export const NetworkDns = () => {
  const t = useTranslations("networkById");
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

  const submitHandler = (e: React.FormEvent) => {
    e.preventDefault();
    // add toast notification if address or domain is empty
    if (!state.address || !state.domain) {
      return toast.error(t("networkDns.addressAndDomainRequired"));
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
      <div
        tabIndex={0}
        className="collapse-arrow collapse w-full border border-base-300 bg-base-200"
      >
        <input type="checkbox" />
        <div className="collapse-title">{t("networkDns.DNS")}</div>
        <div className="collapse-content" style={{ width: "100%" }}>
          <div className="flex">
            <div>
              <p className="text-xs text-gray-300">
                {t("networkDns.requiresZeroTierVersion")}
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
                  className="btn btn-warning btn-outline btn-xs"
                >
                  {t("networkDns.clearDNS")}
                </button>
              ) : null}
            </div>
          </div>
          <div>
            <form className="grid grid-cols-2 gap-5 pt-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">
                    {t("networkDns.searchDomain")}
                  </span>
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
                  <span className="label-text">
                    {t("networkDns.serverAddress")}
                  </span>
                </label>
                <div className="join">
                  <input
                    name="address"
                    value={state.address}
                    onChange={onChangeHandler}
                    className="input join-item input-sm  w-full"
                    placeholder="10.147.20.190"
                  />
                </div>
              </div>
              <button
                type="submit"
                onClick={submitHandler}
                className="btn btn-sm bg-base-300 text-secondary-content"
              >
                {t("networkDns.submit")}
              </button>
            </form>
            <div>
              {Array.from(state.servers).length > 0 ? (
                <p>{t("networkDns.servers")}</p>
              ) : null}
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
        </div>
      </div>
    </>
  );
};
