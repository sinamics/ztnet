import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { api } from "~/utils/api";
import CardComponent from "./privatePublic";
import { useTranslations } from "next-intl";

interface IProp {
  central?: boolean;
}

export const NetworkPrivatePublic = ({ central = false }: IProp) => {
  const t = useTranslations();
  const { query } = useRouter();
  const {
    data: networkByIdQuery,
    isLoading,
    refetch: refecthNetworkById,
  } = api.network.getNetworkById.useQuery(
    {
      nwid: query.id as string,
      central,
    },
    { enabled: !!query.id }
  );

  const { mutate: updateNetworkMutation } =
    api.network.updateNetwork.useMutation({
      onError: (e) => {
        void toast.error(e?.message);
      },
    });

  const privateHandler = (privateNetwork: boolean) => {
    updateNetworkMutation(
      {
        updateParams: { private: privateNetwork },
        nwid: query.id as string,
        central,
      },
      {
        onSuccess: () => {
          void refecthNetworkById();
          const secure = privateNetwork
            ? "private"
            : "public, please use with caution!";

          toast.success(
            t("networkById.privatePublicSwitch.accessControllMessage", {
              authType: secure,
            }),
            { icon: "⚠️" }
          );
        },
      }
    );
  };
  const { network } = networkByIdQuery || {};
  if (isLoading) return <div>Loading</div>;

  return (
    <div className="">
      <div className="flex flex-wrap gap-3">
        <CardComponent
          onClick={() => privateHandler(true)}
          faded={!network.private}
          title={t("networkById.privatePublicSwitch.privateCardTitle")}
          rootClassName="min-w-full sm:min-w-min transition ease-in-out delay-150 hover:-translate-y-1 border border-success border-2 rounded-md solid cursor-pointer bg-transparent text-inherit flex-1 "
          iconClassName="text-green-500"
          content={t("networkById.privatePublicSwitch.privateCardContent")}
        />
        <CardComponent
          onClick={() => privateHandler(false)}
          faded={network.private}
          title={t("networkById.privatePublicSwitch.publicCardTitle")}
          rootClassName="transition ease-in-out delay-150 hover:-translate-y-1 border border-red-500 border-2 rounded-md solid cursor-pointer bg-transparent text-inherit flex-1"
          iconClassName="text-warning"
          content={t("networkById.privatePublicSwitch.publicCardContent")}
        />
      </div>
    </div>
  );
};
