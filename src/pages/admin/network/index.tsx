import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { globalSiteVersion } from "~/utils/global";

const NetworkSetting = () => {
  const { mutate: setRegistration } =
    api.admin.updateGlobalOptions.useMutation();

  const {
    data: options,
    refetch: refetchOptions,
    isLoading: loadingOptions,
  } = api.admin.getAllOptions.useQuery();

  if (loadingOptions) {
    return (
      <div className="flex flex-col items-center justify-center">
        <h1 className="text-center text-2xl font-semibold">
          <progress className="progress progress-primary w-56"></progress>
        </h1>
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full flex-col justify-center space-y-5 bg-base-100 p-3 sm:w-6/12">
      <div className="pb-10">
        <p className="text-sm text-gray-400">Notations</p>
        <div className="divider mt-0 p-0 text-gray-500"></div>
        <div className="flex items-center justify-between">
          <p>Add Member Notations</p>
          <input
            type="checkbox"
            checked={options?.enableRegistration}
            className="checkbox-primary checkbox checkbox-sm"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setRegistration(
                { enableRegistration: e.target.checked },
                { onSuccess: () => void refetchOptions() }
              );
            }}
          />
        </div>
      </div>
    </main>
  );
};
NetworkSetting.getLayout = function getLayout(page: ReactElement) {
  return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default NetworkSetting;
