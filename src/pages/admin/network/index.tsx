import { type ReactElement } from "react";

import { LayoutAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";

const NetworkSetting = () => {
  const { mutate: updateNotation } =
    api.admin.updateGlobalNotation.useMutation();

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
        <p className="text-sm text-gray-400">Member Anotations</p>
        <div className="divider mt-0 p-0 text-gray-500"></div>
        <div className="flex justify-between py-2">
          <div>
            <p className="font-medium">Show marker in Table</p>
            <p className="text-sm text-gray-500">
              This will add a circle before the the member name with the
              anotation color.
              <br /> You can still search the anotation if disabled.
            </p>
          </div>
          <input
            type="checkbox"
            checked={options?.showNotationMarkerInTableRow}
            className="checkbox-primary checkbox checkbox-sm justify-self-end"
            onChange={(e) => {
              updateNotation(
                {
                  showNotationMarkerInTableRow: e.target.checked,
                },
                { onSuccess: () => void refetchOptions() }
              );
            }}
          />
        </div>
        <div className="flex justify-between py-1">
          <div>
            <p className="font-medium">Add background color in table</p>
            <p className="text-sm text-gray-500">
              This will add row background color based on the anotation color.
              <br /> You can still search the anotation if disabled.
            </p>
          </div>
          <input
            type="checkbox"
            checked={options?.useNotationColorAsBg}
            className="checkbox-primary checkbox checkbox-sm justify-self-end"
            onChange={(e) => {
              updateNotation(
                {
                  useNotationColorAsBg: e.target.checked,
                },
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
