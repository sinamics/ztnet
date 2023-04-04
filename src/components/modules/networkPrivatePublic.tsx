import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { type CustomError } from "~/types/errorHandling";
import { api } from "~/utils/api";
import CardComponent from "./privatePublic";

export const NetworkPrivatePublic = () => {
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

  const privateHandler = (privateNetwork: boolean) => {
    updateNetworkMutation(
      {
        updateParams: { privateNetwork },
        nwid: query.id as string,
      },
      {
        onSuccess: () => {
          void refecthNetworkById();
          toast.success(
            `Your network is now ${
              privateNetwork ? "private" : "public, ⚠️ please use with caution!"
            }`
          );
        },
      }
    );
  };
  const { network } = networkByIdQuery;
  if (isLoading) return <div>Loading</div>;

  return (
    <div className="">
      <div className="flex flex-wrap gap-3">
        <CardComponent
          onClick={() => privateHandler(true)}
          faded={!network.private}
          title="Private"
          rootClassName="min-w-full sm:min-w-min transition ease-in-out delay-150 hover:-translate-y-1 border border-success border-2 rounded-md solid cursor-pointer bg-transparent text-inherit flex-1 "
          iconClassName="text-green-500"
          content="Each user needs to be Autorization by network administrator."
        />
        <CardComponent
          onClick={() => privateHandler(false)}
          faded={network.private}
          title="Public"
          rootClassName="transition ease-in-out delay-150 hover:-translate-y-1 border border-red-500 border-2 rounded-md solid cursor-pointer bg-transparent text-inherit flex-1"
          iconClassName="text-warning"
          content="All users can connect to this network without Autorization"
        />
      </div>
    </div>
  );
};
