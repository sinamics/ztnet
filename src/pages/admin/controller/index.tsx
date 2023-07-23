/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { clearConfigCache } from "prettier";
import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";

const Controller = () => {
  const { data: controllerData, isLoading } =
    api.admin.getControllerStats.useQuery();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const { networkCount, totalMembers, controllerStatus } = controllerData;

  const { allowManagementFrom, allowTcpFallbackRelay, listeningOn } =
    controllerStatus?.config?.settings;

  const { online, tcpFallbackActive, version } = controllerStatus;

  return (
    <main className="mx-auto flex w-full flex-col justify-center space-y-5 bg-base-100 p-3 sm:w-6/12">
      <div className="pb-10">
        <p className="text-sm text-gray-400">Networks & Members</p>
        <div className="divider mt-0 p-0 text-gray-500"></div>
        <div className="flex items-center justify-between">
          <p>Total Network`s:</p>
          <p>{networkCount}</p>
        </div>
        <div className="flex items-center justify-between">
          <p>Total Members:</p>
          <p>{totalMembers}</p>
        </div>
      </div>
      <div className="pb-10">
        <p className="text-sm text-gray-400">Management</p>
        <div className="divider mt-0 p-0 text-gray-500"></div>
        <div className="flex items-center justify-between">
          <p>Allow Management From:</p>
          <div className="list-inside list-disc">
            {allowManagementFrom.map((address, index) => (
              <span key={index}>{address}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p>Allow TCP Fallback Relay:</p>
          <p>{allowTcpFallbackRelay ? "Yes" : "No"}</p>
        </div>
        <div className="flex items-center justify-between">
          <p>Listening On:</p>
          <div className="list-inside list-disc space-x-2">
            {listeningOn.map((address, index) => (
              <span key={index}>{address}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="pb-10">
        <p className="text-sm text-gray-400">Controller Status</p>
        <div className="divider mt-0 p-0 text-gray-500"></div>

        <div className="flex items-center justify-between">
          <p>Online:</p>
          <p>{online ? "Yes" : "No"}</p>
        </div>
        <div className="flex items-center justify-between">
          <p>TCP Fallback Active:</p>
          <p>{tcpFallbackActive ? "Yes" : "No"}</p>
        </div>
        <div className="flex items-center justify-between">
          <p>Version:</p>
          <p>{version}</p>
        </div>
      </div>
    </main>
  );
};
Controller.getLayout = function getLayout(page: ReactElement) {
  return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default Controller;
