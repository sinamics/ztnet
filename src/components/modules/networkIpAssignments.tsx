/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { api } from "~/utils/api";
import cn from "classnames";

export const NetworkIpAssignment = () => {
  const { query } = useRouter();
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

  const { network } = networkByIdQuery;
  if (isLoading) return <div>Loading</div>;

  return (
    <>
      {/* <div>IPv4 assignment</div> */}
      <div className="flex items-center gap-4 py-3">
        <p>Auto-Assign from Range</p>
        <input
          type="checkbox"
          checked={network.autoAssignIp}
          className="checkbox checkbox-primary checkbox-sm"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            submitUpdate({ autoAssignIp: e.target.checked });
          }}
        />
      </div>
      <div
        className={cn(
          "xs:grid-cols-4 grid cursor-pointer grid-cols-3 gap-2 sm:grid-cols-3 md:grid-cols-4",
          {
            "pointer-events-none cursor-no-drop text-gray-500 opacity-25":
              !network.autoAssignIp,
          }
        )}
      >
        {network.cidr?.map((cidr: string) => {
          return network?.routes?.some((route) => route.target === cidr) ? (
            <div
              key={cidr}
              className={cn(
                "badge badge-ghost badge-outline badge-lg rounded-md text-xs opacity-30 md:text-base",
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
                "badge badge-ghost badge-outline badge-lg rounded-md text-xs opacity-30 md:text-base",
                { "hover:bg-primary": network.autoAssignIp }
              )}
            >
              {cidr}
            </div>
          );
        })}
      </div>
    </>
  );
};
