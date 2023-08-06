/* eslint-disable @typescript-eslint/no-unsafe-call */
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import { type ErrorData } from "~/types/errorHandling";
import { useTranslations } from "next-intl";

interface IProp {
  central?: boolean;
}

export const NetworkDns = ({ central = false }: IProp) => {
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
      central,
    },
    { enabled: !!query.id }
  );

  const { mutate: updateNetwork } = api.network.dns.useMutation({
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
      !networkByIdQuery?.network?.dns ||
      !Array.isArray(networkByIdQuery?.network?.dns.servers)
    )
      return;
    setState((prev) => ({
      ...prev,
      domain: networkByIdQuery?.network?.dns.domain,
      servers:
        new Set([...networkByIdQuery?.network?.dns.servers]) || new Set(),
    }));
  }, [networkByIdQuery?.network.dns]);

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

  const updateDns = (servers: string[]) => {
    updateNetwork(
      {
        nwid: network.nwid,
        central,
        updateParams: {
          dns: {
            domain: state.domain,
            servers,
          },
        },
      },
      {
        onSuccess: () => {
          void refetchNetwork();
          toast.success("DNS updated successfully");
          setState((prev) => ({
            ...prev,
            servers: new Set(servers),
            address: "",
          }));
        },
      }
    );
  };

  const submitHandler = (e: React.FormEvent) => {
    e.preventDefault();
    // add toast notification if address or domain is empty
    if (!state.address || !state.domain) {
      return toast.error(t("networkDns.addressAndDomainRequired"));
    }

    // Generate an array with all the servers (old and new ones)
    const servers = [...state.servers, state.address];
    updateDns(servers);
  };

  const removeDnsServer = (dnsToRemove: string) => {
    const newServers = Array.from(state.servers).filter(
      (dns) => dns !== dnsToRemove
    );
    updateDns(newServers);
  };

  const { network } = networkByIdQuery || {};
  return (
    <>
      <div
        tabIndex={0}
        className="collapse-arrow collapse w-full border border-base-300 bg-base-200"
      >
        <input type="checkbox" />
        <div className="collapse-title">{t("networkDns.DNS")}</div>
        <div className="collapse-content" style={{ width: "100%" }}>
          <p className="text-xs text-gray-300">
            {t("networkDns.requiresZeroTierVersion")}
          </p>

          <div>
            {Array.from(state.servers).length > 0 ? (
              <p>{t("networkDns.servers")}</p>
            ) : null}
            <div className="flex justify-between">
              <div className="flex flex-wrap gap-3">
                {Array.from(state.servers).map((dns, idx: number) => (
                  <div key={idx} className="form-control flex">
                    <div className="text-md badge badge-primary label-text badge-lg gap-2 rounded-md opacity-80">
                      {dns}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="h-5 w-5 cursor-pointer"
                        // onClick={() => !isUpdating && deleteRoute(route)}
                        onClick={() => removeDnsServer(dns)}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mx-auto flex">
                {Array.from(state.servers).length > 0 ? (
                  <button
                    onClick={() =>
                      updateNetwork(
                        {
                          nwid: network.nwid,
                          central,
                          clearDns: true,
                        },
                        {
                          onSuccess: () => {
                            void refetchNetwork();
                            setState((prev) => ({
                              ...prev,
                              servers: new Set<string>(),
                              address: "",
                            }));
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
          </div>
        </div>
      </div>
    </>
  );
};
