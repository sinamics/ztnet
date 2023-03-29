import { useRouter } from "next/router";
import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { NettworkSettings } from "~/components/modules/networkRoutes";
import { MembersTable } from "~/components/modules/membersTable";
import { api } from "~/utils/api";
import { NetworkIpAssignment } from "~/components/modules/networkIpAssignments";
import { NetworkPrivatePublic } from "~/components/modules/networkPrivatePublic";
import { AddMemberById } from "~/components/modules/addMemberById";

const NetworkById = () => {
  const { query } = useRouter();
  const { data: networkById, isLoading: loadingNetwork } =
    api.network.getNetworkById.useQuery(
      {
        nwid: query.id as string,
      },
      // { enabled: !!query.id, refetchInterval: 10000 }
      { enabled: !!query.id }
    );

  if (loadingNetwork) {
    return <progress className="progress w-56"></progress>;
  }

  const { network, members } = networkById;
  // console.log(zombieMembers);
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
        <NetworkPrivatePublic />
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
      <div className="w-5/5 mx-auto grid grid-cols-1 space-y-4 px-4 py-4 text-sm  sm:w-4/5 sm:px-10 md:text-base xl:flex">
        {/* Ipv4 assignment  */}
        <div className="w-6/6 xl:w-3/6 ">
          <NetworkIpAssignment />
        </div>

        <div className="divider col-start-2 hidden lg:divider-horizontal xl:inline-flex"></div>

        {/* Manged routes section */}
        <div className="w-6/6 xl:w-3/6 ">
          <NettworkSettings />
        </div>
      </div>
      <div className="w-5/5 divider mx-auto flex px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:text-base">
        Network Members
      </div>
      <div className="w-5/5 mx-auto flex px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:text-base">
        {members.length ? (
          <div className="membersTable-wrapper">
            <MembersTable
              nwid={network.nwid}

              // setEditing={(e: boolean) => setEditing(e)}
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
          <div className="alert alert-warning flex justify-center shadow-lg">
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
                displayed
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="w-5/5 mx-auto flex px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:text-base">
        <AddMemberById />
      </div>
    </div>
  );
};

NetworkById.getLayout = function getLayout(page: ReactElement) {
  return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default NetworkById;
