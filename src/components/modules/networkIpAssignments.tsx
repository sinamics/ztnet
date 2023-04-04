import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { type CustomError } from "~/types/errorHandling";
import { api } from "~/utils/api";

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
      onError: ({ shape }: CustomError) => {
        void toast.error(shape?.data?.zodError?.fieldErrors?.updateParams);
      },
    });

  const submitHandler = (cidr: string) => {
    updateNetworkMutation(
      {
        updateParams: { ipPool: cidr },
        nwid: query.id as string,
      },
      { onSuccess: void refecthNetworkById() }
    );
  };
  const { network } = networkByIdQuery;
  if (isLoading) return <div>Loading</div>;

  return (
    <>
      <div>IPv4 assignment</div>
      <div className="xs:grid-cols-4 grid cursor-pointer grid-cols-3 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {network.cidr?.map((cidr) => {
          return network?.routes?.some((route) => route.target === cidr) ? (
            <div
              key={cidr}
              className="badge badge-lg rounded-md bg-primary text-xs md:text-base"
            >
              {cidr}
            </div>
          ) : (
            <div
              key={cidr}
              onClick={() => submitHandler(cidr)}
              className="badge-ghost badge-outline badge badge-lg rounded-md text-xs opacity-30 hover:bg-primary md:text-base"
            >
              {cidr}
            </div>
          );
        })}
      </div>
    </>
  );
};
