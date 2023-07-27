import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import { useRouter } from "next/router";
import { isIPInSubnet } from "~/utils/isIpInsubnet";
import cn from "classnames";
import { useState, useEffect } from "react";
import { type Prisma } from "@prisma/client";
import {
  type TagDetails,
  type CapabilitiesByName,
  type TagsByName,
} from "~/types/network";
import Anotation from "./anotation";

interface ModalContentProps {
  nwid: string;
  memberId: string;
  // ipAssignments: string[];
}
const initialIpState = { ipInput: "", isValid: false };

export const MemberOptionsModal: React.FC<ModalContentProps> = ({
  nwid,
  memberId,
}) => {
  const [state, setState] = useState(initialIpState);
  const [ipAssignments, seIpAssignments] = useState<string[]>([]);

  const { query } = useRouter();
  const { data: networkById, refetch: refetchNetworkById } =
    api.network.getNetworkById.useQuery(
      {
        nwid,
      },
      { enabled: !!query.id, networkMode: "online" }
    );
  const { data: memberById, refetch: refetchMemberById } =
    api.networkMember.getMemberById.useQuery(
      {
        nwid,
        id: memberId,
      },
      { enabled: !!query.id, networkMode: "online" }
    );

  useEffect(() => {
    // find member by id
    const member = networkById?.members.find(
      (member) => member.id === memberId
    );

    seIpAssignments(member?.ipAssignments || []);
  }, [networkById?.members, memberId]);

  const { mutate: updateMember, isLoading: updateMemberLoading } =
    api.networkMember.Update.useMutation({
      onError: (e) => {
        // zod error
        // console.log(shape?.data?.zodError.fieldErrors);
        // custom error
        void toast.error(e?.message);
      },
      onSuccess: () => refetchNetworkById(),
    });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const subnetMatch = isIPInSubnet(
      e.target.value,
      networkById?.network?.routes
    );
    setState((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
      isValid: subnetMatch,
    }));
  };
  const deleteIpAssignment = (
    ipAssignments: Array<string>,
    Ipv4: string,
    id: string
  ) => {
    const _ipv4 = [...ipAssignments];
    const newIpPool = _ipv4.filter((r) => r !== Ipv4);

    updateMember(
      {
        updateParams: { ipAssignments: [...newIpPool] },
        memberId: id,
        nwid,
      },
      {
        onSuccess: () => {
          void refetchNetworkById();
        },
      }
    );
  };
  const handleIpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { ipInput } = state;
    const { target } = networkById?.network?.routes[0] || {};
    // const subnetMatch = isIPInSubnet(ipInput, networkById?.network?.routes);

    // if (!subnetMatch) {
    //   void toast.error(
    //     `IP needs to be within any of the routes subnet ${JSON.stringify(
    //       networkById?.network?.routes.map((r) => r.target)
    //     )}`
    //   );
    //   return;
    // }
    if (!ipInput) {
      return;
    }
    if (ipAssignments.includes(ipInput)) {
      void toast.error(`IP ${target} already assigned`);
      return;
    }

    const regex = new RegExp(
      "^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\." +
        "(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\." +
        "(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\." +
        "(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
    );

    if (!regex.test(ipInput)) {
      void toast.error(`IP ${target} is not a valid IP address`);
      return;
    }

    updateMember(
      {
        updateParams: { ipAssignments: [...ipAssignments, ipInput] },
        memberId,
        nwid,
      },
      {
        onSuccess: () => {
          void refetchNetworkById();
          setState(initialIpState);
        },
      }
    );
  };

  const CapabilityCheckboxes: React.FC<CapabilitiesByName | null> = (caps) => {
    const handleCheckboxChange = (
      e: React.ChangeEvent<HTMLInputElement>,
      capId: number
    ) => {
      // Convert array to Set for easy addition and removal of items
      const capabilitiesSet = new Set(memberById?.capabilities as number[]);

      if (e.target.checked) {
        // Add capId to the set
        capabilitiesSet.add(capId);
      } else {
        // Remove capId from the set
        capabilitiesSet.delete(capId);
      }

      // Convert set back to array
      const capabilities = Array.from(capabilitiesSet);

      // Update the state
      updateMember(
        {
          updateParams: {
            capabilities,
          },
          memberId,
          nwid,
        },
        {
          onSuccess: () => {
            void refetchMemberById();
          },
        }
      );
    };

    const isCapabilitiesArray = (
      capabilities: Prisma.JsonValue
    ): capabilities is number[] => {
      return (
        Array.isArray(capabilities) &&
        capabilities.every((item) => typeof item === "number")
      );
    };

    if (!caps || !Object.entries(caps).length)
      return <p className="text-sm text-gray-500">None</p>;
    return (
      <div className="flex flex-wrap">
        {Object.entries(caps).map(([capability, capId], index) => {
          const isChecked =
            isCapabilitiesArray(memberById?.capabilities) &&
            memberById.capabilities.includes(capId);

          return (
            <div key={index}>
              <label className="flex items-center gap-2 p-2">
                <input
                  type="checkbox"
                  name={capability}
                  checked={isChecked}
                  className="checkbox-primary checkbox checkbox-sm justify-self-end"
                  onChange={(e) => handleCheckboxChange(e, capId)}
                />
                {capability}
              </label>
            </div>
          );
        })}
      </div>
    );
  };

  const TagDropdowns: React.FC<TagsByName> = (tagsByName) => {
    const handleDropdownChange = (
      e: React.ChangeEvent<HTMLSelectElement>,
      tagName: string,
      tagDetails: TagDetails
    ) => {
      const selectedOption = e.target.value;
      const selectedValue = tagDetails.enums[selectedOption];
      const tagId = tagDetails.id;

      // Create a Map from existing tags for easy lookup and update
      const tagMap = new Map(memberById.tags as [number, number][]);

      if (selectedOption === "None") {
        tagMap.delete(tagId); // Delete the entry if "None" is selected
      } else {
        // Update the value for this tagId in the map
        tagMap.set(tagId, selectedValue);
      }

      // Convert back to the array of arrays format
      const tags = Array.from(tagMap.entries());

      updateMember(
        {
          updateParams: {
            tags,
          },
          memberId,
          nwid,
        },
        {
          onSuccess: () => {
            void refetchMemberById();
          },
        }
      );
    };

    if (!tagsByName || Object.keys(tagsByName).length === 0) {
      return <p className="text-sm text-gray-500">None</p>;
    }
    // Create a Map from existing tags for easy lookup
    const tagMap = new Map(memberById?.tags as [number, number][]);

    return (
      <div className="flex flex-wrap gap-2">
        {Object.entries(tagsByName).map(([tagName, tagDetails]) => {
          if (
            !tagDetails ||
            typeof tagDetails !== "object" ||
            !tagDetails.enums
          ) {
            return null;
          }

          // Find the value for this tag in memberById
          const tagValue = tagMap.get(tagDetails.id);

          // Find the corresponding option for this value
          const selectedOption =
            Object.entries(tagDetails.enums).find(
              ([_, value]) => value === tagValue
            )?.[0] ?? "None";

          // console.log(selectedOption);
          return (
            <div
              key={tagName}
              className="form-control w-5/12 rounded-md border border-base-100 p-2"
            >
              <label className="label">
                <span className="label-text">{tagName.toUpperCase()}</span>
              </label>
              <select
                className="select select-bordered select-sm"
                onChange={(e) => handleDropdownChange(e, tagName, tagDetails)}
                value={selectedOption}
              >
                <option value="None">None</option>
                {Object.entries(tagDetails.enums).map(([option]) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    );
  };

  // console.log(networkById);
  return (
    <div>
      {updateMemberLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <span className="loading loading-bars loading-lg"></span>
        </div>
      ) : null}
      <div className={cn({ "opacity-30": updateMemberLoading })}>
        <div className="grid grid-cols-4 items-start gap-4">
          <div className="col-span-3">
            <header>Ip Assignment</header>
            <p className="text-sm text-gray-500">
              Add or remove an IP address for this member.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-center">
          {ipAssignments.map((assignedIp) => {
            const subnetMatch = isIPInSubnet(
              assignedIp,
              networkById?.network?.routes
            );
            return (
              <div
                key={assignedIp}
                className={`${
                  subnetMatch
                    ? "badge badge-primary badge-lg rounded-md"
                    : "badge badge-ghost badge-lg rounded-md opacity-60"
                } flex min-w-fit justify-between`}
              >
                <div className="cursor-pointer">{assignedIp}</div>

                {ipAssignments.length > 0 && (
                  <div title="delete ip assignment">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="z-10 ml-4 h-4 w-4 cursor-pointer text-warning"
                      onClick={() =>
                        deleteIpAssignment(ipAssignments, assignedIp, memberId)
                      }
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="my-5">
          <form>
            <label className="input-group input-group-sm">
              <span className="bg-base-200">Address</span>
              <input
                type="text"
                name="ipInput"
                onChange={handleInputChange}
                value={state.ipInput}
                placeholder="192.168.169.x"
                className={cn("input input-bordered input-sm", {
                  "border-error": !state.isValid && state.ipInput.length > 0,
                  "border-success": state.isValid,
                })}
              />
              <button
                onClick={handleIpSubmit}
                type="submit"
                // disabled={!state.isValid}
                className="btn-square btn-sm w-12 bg-base-200"
              >
                Add
              </button>
            </label>
          </form>
        </div>
        {/* <div className="divider flex px-4 py-4 text-sm"></div> */}

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
            checked={memberById?.activeBridge}
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
                    void refetchMemberById();
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
            checked={memberById?.noAutoAssignIps}
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
                    void refetchMemberById();
                  },
                }
              );
            }}
          />
        </div>
        <div className="grid grid-cols-4 items-start gap-4 py-3">
          <div className="col-span-4">
            <header>Capabilities:</header>
            {CapabilityCheckboxes(networkById?.network?.capabilitiesByName)}
          </div>
        </div>
        <div className="grid grid-cols-4 items-start gap-4 py-3">
          <div className="col-span-4">
            <header>Tags:</header>
            {TagDropdowns(networkById?.network?.tagsByName)}
          </div>
        </div>
        <div className="grid grid-cols-4 items-start gap-4 py-3">
          <div className="col-span-4">
            <Anotation nwid={nwid} />
          </div>
        </div>
      </div>
    </div>
  );
};
