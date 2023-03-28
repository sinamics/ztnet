/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useRouter } from "next/router";
import { type ReactElement, useRef, useState } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { NettworkSettings } from "~/components/modules/networkRoutes";
import { MembersTable } from "~/components/modules/membersTable";
import CardComponent from "~/components/modules/privatePublic";
import { api } from "~/utils/api";
import { NetworkIpAssignment } from "~/components/modules/networkIpAssignments";

const NetworkById = () => {
  const [state, setState] = useState<Record<"copied" | "editName", boolean>>({
    copied: false,
    editName: false,
  });
  const [editing, setEditing] = useState<boolean>(false);
  const [viewDeletedMembers, setViewDeletedMembers] = useState<boolean>(false);
  const zombieTableRef = useRef<HTMLInputElement>(null);
  const [handler, setHandler] = useState<
    Record<"networkName" | "memberId" | "value", string>
  >({
    networkName: "",
    memberId: "",
    value: "",
  });
  const { query } = useRouter();
  const {
    data: networkById,
    isLoading: loadingNetwork,
    refetch: refetchNetworkById,
    // error: loadingNetworkError,
    // subscribeToMore: memberInformationListner,
  } = api.network.getNetworkById.useQuery(
    {
      nwid: query.id as string,
    },
    // { enabled: !!query.id, refetchInterval: 10000 }
    { enabled: !!query.id }
  );

  const copyNwidIntercalCleanup = useRef<any>({});
  // console.log(networkById);
  if (loadingNetwork) {
    return <progress className="progress w-56"></progress>;
  }
  const updateNetworkHandler = (data: any) => {
    setState((prev: any) => ({ ...prev, editName: false }));
    // updateNetwork({
    //   variables: { nwid: network.nwid, data },
    // });
  };
  const { network, members, zombieMembers }: any = networkById;

  return (
    <div>
      <div className="w-5/5 mx-auto flex flex-row flex-wrap justify-between space-y-10 p-4 text-sm sm:w-4/5 sm:p-10 md:text-base xl:space-y-0">
        <div className="w-5/5 h-fit w-full xl:w-2/6 ">
          <div className="flex flex-col space-y-3 sm:space-y-0">
            <div className="flex flex-col justify-between sm:flex-row">
              <span className="font-semibold">Network ID:</span>
              <span>{network?.nwid}</span>
            </div>
            <div className="flex flex-col justify-between sm:flex-row">
              <span className="font-semibold">Network Name:</span>
              <span>{network?.name}</span>
            </div>
            <div className="flex flex-col justify-between sm:flex-row">
              <span className="font-semibold">Network is</span>
              {network.private ? (
                <span className="text-success">Private</span>
              ) : (
                <span className="text-danger">Public</span>
              )}
            </div>
          </div>
        </div>
        <div className="">
          <div className="flex flex-wrap gap-3">
            <CardComponent
              onClick={() => updateNetworkHandler({ private: true })}
              faded={!network.private}
              title="Private"
              rootClassName="min-w-full sm:min-w-min transition ease-in-out delay-150 hover:-translate-y-1 border border-success border-2 rounded-md solid opacity-90 cursor-pointer bg-transparent text-inherit flex-1 "
              iconClassName="text-green-500"
              content="Each user needs to be Autorization by network administrator."
            />
            <CardComponent
              onClick={() => updateNetworkHandler({ private: false })}
              faded={network.private}
              title="Public"
              rootClassName="transition ease-in-out delay-150 hover:-translate-y-1 border border-red-500 border-2 rounded-md solid opacity-50 cursor-pointer bg-transparent text-inherit flex-1"
              iconClassName="text-warning"
              content="All users can connect to this network without Autorization"
            />
          </div>
        </div>
      </div>
      <div className="w-5/5 mx-auto flex px-4 text-sm sm:w-4/5 sm:px-10 md:text-base">
        <div className="flex flex-col justify-between sm:flex-row sm:space-x-3">
          <div>
            <span className="text-muted font-semibold">Network Start:</span>{" "}
            <span>{network && network.ipAssignmentPools[0]?.ipRangeStart}</span>
          </div>
          <div>
            <span className="text-muted font-semibold">Network End:</span>{" "}
            {network && network.ipAssignmentPools[0]?.ipRangeEnd}
          </div>
          <div>
            <span className="text-muted font-semibold">Network Cidr:</span>{" "}
            {network && network.routes[0]?.target}
          </div>
        </div>
      </div>
      <div className="w-5/5 divider mx-auto flex px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:text-base">
        Network Settings
      </div>
      <div className="mx-auto w-full text-center text-xs sm:w-4/5 sm:px-10">
        <p>
          This is used for advanced routing, and should not be changed unless
          you absolutely have to.
        </p>
      </div>
      <div className="mx-auto flex w-full justify-between px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:text-base">
        <NetworkIpAssignment />
        <div className="divider lg:divider-horizontal"></div>
        {/* Manged routes section */}
        <div className="w-6/12">
          <NettworkSettings />
        </div>
      </div>
      <div className="w-5/5 divider mx-auto flex px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:text-base">
        Network Members
      </div>
      <div className="w-5/5 mx-auto flex px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:text-base">
        {members.length ? (
          <div className="table-wrapper">
            <MembersTable
              nwid={network.nwid}
              cidr={network?.routes[0]?.target ?? "0.0.0.0/24"}
              tableData={members}
              setEditing={(e: boolean) => setEditing(e)}
              refetchNetworkById={refetchNetworkById}
            />
          </div>
        ) : (
          // <MembersTable cidr={network?.routes[0]?.target} tableData={members} setEditing={(e: boolean) => setEditing(e)} />
          // <Message
          //   color='yellow'
          //   icon='user'
          //   header='No members found!'
          //   content='Join this network ID and the device will automatically be displayed in this table'
          // />
          <div className="alert alert-warning shadow-lg">
            <div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 flex-shrink-0 stroke-current"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>
                Join this network ID and the device will automatically be
                displayed in this table
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

NetworkById.getLayout = function getLayout(page: ReactElement) {
  return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default NetworkById;
