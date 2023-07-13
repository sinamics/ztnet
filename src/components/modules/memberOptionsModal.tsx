import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import { useRouter } from "next/router";
import { type CustomError } from "~/types/errorHandling";

interface ModalContentProps {
  nwid: string;
  memberId: string;
}

export const MemberOptionsModal: React.FC<ModalContentProps> = ({
  nwid,
  memberId,
}) => {
  // const [state, setState] = useState(initalState);
  const { query } = useRouter();
  const { data: networkById, refetch: refetchNetworkById } =
    api.network.getNetworkById.useQuery(
      {
        nwid,
      },
      { enabled: !!query.id, networkMode: "online" }
    );

  const { mutate: updateMember } = api.networkMember.Update.useMutation({
    onError: ({ shape }: CustomError) => {
      // console.log(shape?.data?.zodError.fieldErrors);
      void toast.error(shape?.data?.zodError?.fieldErrors?.updateParams);
    },
    onSuccess: () => refetchNetworkById(),
  });

  return (
    <>
      <div className="grid grid-cols-4 items-start gap-4 py-3">
        <div className="col-span-3">
          <header>Allow Ethernet Bridging</header>
          <p className="text-sm text-gray-500">
            Bridging requires additional setup on the device. See manual and
            knowledgebase for more information. Mobile devices cannot be
            bridges.
          </p>
        </div>
        <input
          type="checkbox"
          checked={networkById.members[0].activeBridge}
          className="checkbox-primary checkbox checkbox-sm justify-self-end"
          onChange={(e) => {
            updateMember(
              {
                updateParams: {
                  activeBridge: e.target.checked,
                },
                memberId,
                nwid,
              },
              {
                onSuccess: () => {
                  void refetchNetworkById();
                },
              }
            );
          }}
        />
      </div>
      <div className="grid grid-cols-4 items-start gap-4 py-3">
        <div className="col-span-3">
          <header>Do Not Auto-Assign IPs</header>
          <p className="text-sm text-gray-500">
            This will disable the ability to automatically assign IP addresses
            to this member.
          </p>
        </div>
        <input
          type="checkbox"
          checked={networkById.members[0].noAutoAssignIps}
          className="checkbox-primary checkbox checkbox-sm justify-self-end"
          onChange={(e) => {
            updateMember(
              {
                updateParams: {
                  noAutoAssignIps: e.target.checked,
                },
                memberId,
                nwid,
              },
              {
                onSuccess: () => {
                  void refetchNetworkById();
                },
              }
            );
          }}
        />
      </div>
    </>
  );
};
