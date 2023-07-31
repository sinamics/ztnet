import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { api } from "~/utils/api";
import cn from "classnames";
import { useState } from "react";
import { type IpAssignmentPoolsEntity } from "~/types/network";

export const NetworkIpAssignment = () => {
  const { query } = useRouter();
  const [ipRange, setIpRange] = useState({ rangeStart: "", rangeEnd: "" });
  const [ipTabs, setIptabs] = useState({ easy: true, advanced: false });
  const {
    data: networkByIdQuery,
    isLoading,
    refetch: refecthNetworkById,
  } = api.network.getNetworkById.useQuery(
    {
      nwid: query.id as string,
    },
    { enabled: !!query.id }
  );

  const { mutate: updateNetworkMutation } =
    api.network.updateNetwork.useMutation({
      onError: (e) => {
        void toast.error(e?.message);
        // void toast.error(shape?.data?.zodError?.fieldErrors?.updateParams);
      },
    });
  const rangeChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIpRange({ ...ipRange, [e.target.name]: e.target.value });
  };
  const submitUpdate = (updateParams: {
    ipPool?: string;
    autoAssignIp?: boolean;
  }) =>
    updateNetworkMutation(
      {
        updateParams,
        nwid: query.id as string,
      },
      {
        onSuccess: () => {
          void refecthNetworkById();
        },
      }
    );
  const deleteIpRange = (poolToDelete: IpAssignmentPoolsEntity) => {
    const { network } = networkByIdQuery;
    const newIpAssignmentPools = network.ipAssignmentPools.filter(
      (pool) =>
        pool.ipRangeStart !== poolToDelete?.ipRangeStart ||
        pool.ipRangeEnd !== poolToDelete?.ipRangeEnd
    );

    updateNetworkMutation(
      {
        updateParams: {
          autoAssignIp: network.autoAssignIp,
          ipAssignmentPools: newIpAssignmentPools,
        },
        nwid: query.id as string,
      },
      {
        onSuccess: () => {
          void refecthNetworkById();
        },
      }
    );
  };
  const submitIpRange = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!ipRange.rangeStart || !ipRange.rangeEnd) {
      void toast.error(`Please enter a valid IP range`);
      return;
    }
    const { network } = networkByIdQuery;

    // Check if the IP range already exists in the network's ipAssignmentPools
    for (const existingRange of network.ipAssignmentPools) {
      if (
        existingRange.ipRangeStart === ipRange.rangeStart &&
        existingRange.ipRangeEnd === ipRange.rangeEnd
      ) {
        void toast.error(`The IP range already exists`);
        return;
      }
    }
    updateNetworkMutation(
      {
        updateParams: {
          autoAssignIp: network.autoAssignIp,
          ipAssignmentPools: [
            ...network.ipAssignmentPools,
            { ipRangeStart: ipRange.rangeStart, ipRangeEnd: ipRange.rangeEnd },
          ],
        },
        nwid: query.id as string,
      },
      {
        onSuccess: () => {
          void refecthNetworkById();
        },
      }
    );
  };
  const { network } = networkByIdQuery;
  if (isLoading) return <div>Loading</div>;

  return (
    <div
      tabIndex={0}
      className="collapse-arrow collapse w-full border border-base-300 bg-base-200"
    >
      <input type="checkbox" />
      <div className="collapse-title">IPv4 Assignment</div>
      <div className="w-100 collapse-content">
        <div className="flex items-center gap-4">
          <p>Auto-Assign from Range</p>
          <input
            type="checkbox"
            checked={network.autoAssignIp}
            className="checkbox-primary checkbox checkbox-sm"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              submitUpdate({ autoAssignIp: e.target.checked });
            }}
          />
        </div>
        {network.autoAssignIp ? (
          <div className="tabs tabs-boxed grid grid-cols-2 gap-5 pb-5">
            <a
              className={cn("tab w-full border border-gray-500", {
                "tab-active border-none": ipTabs.easy,
              })}
              onClick={() =>
                setIptabs((prev) => ({
                  ...prev,
                  advanced: false,
                  easy: true,
                }))
              }
            >
              Easy
            </a>
            <a
              className={cn("tab w-full border border-gray-500", {
                "tab-active border-none": ipTabs.advanced,
              })}
              onClick={() =>
                setIptabs((prev) => ({
                  ...prev,
                  easy: false,
                  advanced: true,
                }))
              }
            >
              Advanced
            </a>
          </div>
        ) : null}
        {network.autoAssignIp && ipTabs.easy ? (
          <div>
            <div
              className={cn("flex cursor-pointer flex-wrap", {
                "pointer-events-none cursor-no-drop text-gray-500 opacity-25":
                  !network.autoAssignIp,
              })}
            >
              {network.cidr?.map((cidr: string) => {
                return network?.routes?.some(
                  (route) => route.target === cidr
                ) ? (
                  <div
                    key={cidr}
                    className={cn(
                      "badge badge-ghost badge-outline badge-lg m-1 rounded-md text-xs opacity-30 md:text-base",
                      {
                        "badge badge-lg rounded-md bg-primary text-xs text-white opacity-70 md:text-base":
                          network.autoAssignIp,
                      }
                    )}
                  >
                    {cidr}
                  </div>
                ) : (
                  <div
                    key={cidr}
                    onClick={() => submitUpdate({ ipPool: cidr })}
                    className={cn(
                      "badge badge-ghost badge-outline badge-lg m-1 rounded-md text-xs opacity-30 md:text-base",
                      { "hover:bg-primary": network.autoAssignIp }
                    )}
                  >
                    {cidr}
                  </div>
                );
              })}
            </div>
          </div>
        ) : //    <div
        //    className={cn("flex cursor-pointer flex-wrap", {
        //      "pointer-events-none cursor-no-drop text-gray-500 opacity-25":
        //        !network.autoAssignIp,
        //    })}
        //  >
        //    {network.cidr?.map((cidr: string) => {
        //      return network?.routes?.some((route) => route.target === cidr) ? (
        //        <div
        //          key={cidr}
        //          className={cn(
        //            "badge badge-ghost badge-outline badge-lg m-1 rounded-md text-xs sm:m-2 md:text-base",
        //            {
        //              "badge badge-lg rounded-md bg-primary text-xs text-white opacity-70 md:text-base":
        //                network.autoAssignIp,
        //            }
        //          )}
        //        >
        //          {cidr}
        //        </div>
        //      ) : (
        //        <div
        //          key={cidr}
        //          onClick={() => submitUpdate({ ipPool: cidr })}
        //          className={cn(
        //            "badge badge-ghost badge-outline badge-lg m-1 rounded-md text-xs sm:m-2 md:text-base",
        //            { "hover:bg-primary": network.autoAssignIp }
        //          )}
        //        >
        //          {cidr}
        //        </div>
        //      );
        //    })}
        //  </div>
        null}
        {network.autoAssignIp && ipTabs.advanced ? (
          <div className="mt-4 space-y-2">
            {network?.ipAssignmentPools.map((pool) => {
              return (
                <div
                  key={pool.ipRangeStart}
                  className={`badge badge-primary badge-lg flex w-64 min-w-fit flex-wrap rounded-md`}
                >
                  <div className="cursor-pointer">
                    {pool.ipRangeStart} - {pool.ipRangeEnd}
                  </div>

                  <div title="delete ip assignment">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="z-10 ml-4 h-4 w-4 cursor-pointer text-warning"
                      onClick={() => deleteIpRange(pool)}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                  </div>
                </div>
              );
            })}
            <form className="grid grid-cols-2 gap-5 pt-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Range Start</span>
                </label>
                <input
                  type="text"
                  name="rangeStart"
                  value={ipRange.rangeStart}
                  onChange={rangeChangeHandler}
                  placeholder="192.168.168.1"
                  className="input input-bordered input-sm w-full"
                />
              </div>
              <div className="form-control ">
                <label className="label">
                  <span className="label-text">Range End</span>
                </label>
                <div className="join">
                  <input
                    type="text"
                    name="rangeEnd"
                    value={ipRange.rangeEnd}
                    onChange={rangeChangeHandler}
                    className="input join-item input-sm  w-full"
                    placeholder="192.168.168.254"
                  />
                </div>
              </div>
              <button
                type="submit"
                onClick={submitIpRange}
                className="btn btn-sm bg-base-300 text-secondary-content"
              >
                Submit
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
};
