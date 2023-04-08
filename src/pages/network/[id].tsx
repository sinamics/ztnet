import { useRouter } from "next/router";
import { useState, type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { NettworkSettings } from "~/components/modules/networkRoutes";
import { NetworkMembersTable } from "~/components/modules/networkMembersTable";
import { api } from "~/utils/api";
import { NetworkIpAssignment } from "~/components/modules/networkIpAssignments";
import { NetworkPrivatePublic } from "~/components/modules/networkPrivatePublic";
import { AddMemberById } from "~/components/modules/addMemberById";
import { CopyToClipboard } from "react-copy-to-clipboard";
import CopyIcon from "~/icons/copy";
import EditIcon from "~/icons/edit";
import Input from "~/components/elements/input";
import toast from "react-hot-toast";

const NetworkById = () => {
  const [state, setState] = useState({
    editNetworkName: false,
    networkName: "",
  });
  const { query } = useRouter();
  const {
    data: networkById,
    isLoading: loadingNetwork,
    error: errorNetwork,
    refetch: refetchNetwork,
  } = api.network.getNetworkById.useQuery(
    {
      nwid: query.id as string,
    },
    { enabled: !!query.id, refetchInterval: 10000 }
  );
  const { mutate: updateNetwork } = api.network.updateNetwork.useMutation();

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

  const { network, members = [] } = networkById || {};
  const changeNameHandler = (e: React.ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateNetwork(
      {
        nwid: network.nwid,
        updateParams: { name: state.networkName },
      },
      {
        onSuccess: () => {
          void refetchNetwork();
          setState({ ...state, editNetworkName: false });
        },
      }
    );
  };
  const eventHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState({ ...state, [e.target.name]: e.target.value });
  };
  return (
    <div>
      {errorNetwork && (
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-center text-2xl font-semibold">
            {errorNetwork.message}
          </h1>
        </div>
      )}
      <div className="w-5/5 mx-auto flex flex-row flex-wrap justify-between space-y-10 p-4 text-sm sm:w-4/5 sm:p-10 md:text-base xl:space-y-0">
        <div className="w-5/5 h-fit w-full xl:w-2/6 ">
          <div className="flex flex-col space-y-3 sm:space-y-0">
            <div className="flex flex-col justify-between sm:flex-row">
              <span className="font-semibold">Network ID:</span>
              <span className="relative left-7 flex items-center gap-2">
                <CopyToClipboard
                  text={network?.nwid}
                  onCopy={() =>
                    toast.success(`${network?.nwid} copied to clipboard`, {
                      id: "copyNwid",
                    })
                  }
                  title="copy to clipboard"
                >
                  <div className="flex cursor-pointer items-center gap-2">
                    {network?.nwid}
                    <CopyIcon />
                  </div>
                </CopyToClipboard>
              </span>
            </div>
            <div className="flex flex-col justify-between sm:flex-row">
              <span className="font-semibold">Network Name:</span>
              <span className="relative left-7 flex items-center gap-2">
                {state.editNetworkName ? (
                  <form onSubmit={changeNameHandler}>
                    <Input
                      focus
                      name="networkName"
                      onChange={eventHandler}
                      // value={state.networkName}
                      defaultValue={network?.name}
                      type="text"
                      placeholder={network?.name}
                      className="input-bordered input-primary input-xs"
                    />
                  </form>
                ) : (
                  network?.name
                )}
                <EditIcon
                  data-testid="changeNetworkName"
                  className="hover:text-opacity-50"
                  onClick={() =>
                    setState({
                      ...state,
                      editNetworkName: !state.editNetworkName,
                    })
                  }
                />
              </span>
            </div>
            <div className="flex flex-col justify-between sm:flex-row">
              <span className="font-semibold">Network is</span>
              {network.private ? (
                <span className="text-success">Private</span>
              ) : (
                <span className="text-error">Public</span>
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
            <NetworkMembersTable
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
