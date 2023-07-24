import { useRouter } from "next/router";
import { useEffect, useState, type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { NettworkRoutes } from "~/components/modules/networkRoutes";
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
import { DeletedNetworkMembersTable } from "~/components/modules/deletedNetworkMembersTable";
import { useModalStore } from "~/utils/store";
import { NetworkFlowRules } from "~/components/modules/networkFlowRules";
import { NetworkDns } from "~/components/modules/networkDns";
import { NetworkMulticast } from "~/components/modules/networkMulticast";
import cn from "classnames";
import NetworkHelpText from "~/components/modules/networkHelp";
import { InviteMemberByMail } from "~/components/modules/inviteMemberbyMail";

const NetworkById = () => {
  const [state, setState] = useState({
    viewZombieTable: false,
    editNetworkName: false,
    toggleDescriptionInput: false,
    description: "",
    networkName: "",
  });
  const { callModal } = useModalStore((state) => state);
  const { query, push: router } = useRouter();
  const { mutate: deleteNetwork } = api.network.deleteNetwork.useMutation();
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
  const { mutate: updateNetwork } = api.network.updateNetwork.useMutation({
    onError: (e) => {
      void toast.error(e?.message);
    },
  });

  useEffect(() => {
    setState({
      ...state,
      description: networkById?.network?.description,
      networkName: networkById?.network?.name,
    });
  }, [networkById?.network?.description, networkById?.network?.name]);

  const toggleDescriptionInput = () => {
    setState({
      ...state,
      toggleDescriptionInput: !state.toggleDescriptionInput,
    });
  };
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
  const eventHandler = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setState({ ...state, [e.target.name]: e.target.value });
  };

  if (errorNetwork) {
    return (
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-center text-2xl font-semibold">
          {errorNetwork.message}
        </h1>
        <ul className="list-disc">
          <li>Verify that the ZeroTier container is operational</li>
          <li>
            If other instances of ZeroTier are active locally, please deactivate
            them as it might cause conflicts.
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div>
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
              <span className="font-medium">Network Name:</span>
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
            <div className="py-3 font-light">
              {!state.toggleDescriptionInput ? (
                <div
                  onClick={toggleDescriptionInput}
                  className="border-l-4 border-primary p-2 leading-snug"
                  style={{ caretColor: "transparent" }}
                >
                  {network?.description}
                </div>
              ) : (
                <form>
                  <textarea
                    rows={3}
                    value={state?.description}
                    name="description"
                    onChange={eventHandler}
                    maxLength={255}
                    style={{ maxHeight: "100px" }}
                    className="custom-scrollbar textarea textarea-primary w-full leading-snug "
                    placeholder="Description"
                    onKeyDown={(
                      e: React.KeyboardEvent<HTMLTextAreaElement>
                    ) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        // submit form when Enter key is pressed and Shift key is not held down.
                        const target = e.target as HTMLTextAreaElement;
                        updateNetwork(
                          {
                            nwid: network.nwid,
                            updateParams: { description: target.value },
                          },
                          {
                            onSuccess: () => {
                              void refetchNetwork();
                              setState({
                                ...state,
                                toggleDescriptionInput:
                                  !state.toggleDescriptionInput,
                              });
                            },
                          }
                        );
                      }
                    }}
                  ></textarea>
                </form>
              )}
            </div>
          </div>
        </div>
        <NetworkPrivatePublic />
      </div>
      <div className="w-5/5 mx-auto flex px-4 text-sm sm:w-4/5 sm:px-10 md:text-base">
        <div className="flex flex-col justify-between sm:flex-row sm:space-x-3">
          <div>
            <span className="text-muted font-medium">Network Start:</span>{" "}
            <span
              className={cn("badge badge-lg rounded-md", {
                "badge-accent": network?.ipAssignmentPools[0]?.ipRangeStart,
              })}
            >
              {network?.ipAssignmentPools[0]?.ipRangeStart || "not set"}
            </span>
          </div>
          <div>
            <span className="text-muted font-medium">Network End:</span>{" "}
            <span
              className={cn("badge badge-lg rounded-md", {
                "badge-accent": network?.ipAssignmentPools[0]?.ipRangeEnd,
              })}
            >
              {network?.ipAssignmentPools[0]?.ipRangeEnd || "not set"}
            </span>
          </div>
          <div>
            <span className="text-muted font-medium">Network Cidr:</span>{" "}
            <span
              className={cn("badge badge-lg rounded-md", {
                "badge-accent": network?.routes[0]?.target,
              })}
            >
              {network?.routes[0]?.target || "not set"}
            </span>
          </div>
        </div>
      </div>
      <div className="w-5/5 divider mx-auto flex px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:text-base">
        Network Settings
      </div>
      <div className="w-5/5 mx-auto grid grid-cols-1  px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:text-base xl:flex">
        {/* Ipv4 assignment  */}
        <div className="w-6/6 xl:w-3/6">
          <NetworkIpAssignment />
        </div>

        <div className="divider col-start-2 hidden lg:divider-horizontal xl:inline-flex"></div>

        {/* Manged routes section */}
        <div className="w-6/6 xl:w-3/6 ">
          <NettworkRoutes />
        </div>
      </div>
      <div className="w-5/5 mx-auto grid grid-cols-1 px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:text-base xl:flex">
        {/* Ipv4 assignment  */}
        <div className="w-6/6 xl:w-3/6">
          <NetworkDns />
        </div>

        <div className="divider col-start-2 hidden lg:divider-horizontal xl:inline-flex"></div>

        {/* Manged broadcast section */}
        <div className="w-6/6 xl:w-3/6">
          <NetworkMulticast />
        </div>
      </div>
      <div className="w-5/5 divider mx-auto flex px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:text-base">
        Network Members
      </div>
      <div className="w-5/5 mx-auto w-full px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:text-base">
        {members.length ? (
          <div className="membersTable-wrapper text-center">
            <NetworkMembersTable
              nwid={network.nwid}
              // setEditing={(e: boolean) => setEditing(e)}
            />
          </div>
        ) : (
          <div className="alert alert-warning flex justify-center shadow-lg">
            <div className="flex">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mr-5 h-6 w-6 flex-shrink-0 stroke-current"
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
      <div className="w-5/5 mx-auto flex space-x-5 px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:text-base">
        <InviteMemberByMail />
        <AddMemberById />
      </div>
      <div className="w-5/5 mx-auto w-full px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:text-base">
        <div className="mb-4 md:mb-0">
          {networkById?.zombieMembers?.length > 0 ? (
            <>
              <button
                onClick={() =>
                  setState({
                    ...state,
                    viewZombieTable: !state.viewZombieTable,
                  })
                }
                className="btn btn-wide"
              >
                View stashed members ({networkById?.zombieMembers?.length})
              </button>

              {state.viewZombieTable ? (
                <div className="membersTable-wrapper text-center">
                  <DeletedNetworkMembersTable nwid={network.nwid} />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      <div className="w-5/5 mx-auto flex px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:text-base">
        <NetworkHelpText />
      </div>

      <div className="w-5/5 mx-auto flex px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:text-base">
        <NetworkFlowRules />
      </div>
      <div className="w-5/5 divider mx-auto flex px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:text-base">
        Network Actions
      </div>
      <div className="w-5/5 mx-auto px-4 py-4 text-sm sm:w-4/5 sm:px-10 md:flex-row md:text-base">
        <div className="flex items-end md:justify-end">
          <button
            onClick={() =>
              callModal({
                title: `Delete network ${network.name}`,
                description: `Are you sure you want to delete this network? This cannot be undone and all members will be deleted from this network`,
                yesAction: () => {
                  deleteNetwork(
                    { nwid: network.nwid },
                    { onSuccess: () => void router("/network") }
                  );
                },
              })
            }
            className="btn btn-error btn-outline btn-wide"
          >
            Delete network
          </button>
        </div>
      </div>
    </div>
  );
};

NetworkById.getLayout = function getLayout(page: ReactElement) {
  return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default NetworkById;
