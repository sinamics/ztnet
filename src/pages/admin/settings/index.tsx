/* eslint-disable @typescript-eslint/no-unused-vars */
import { clearConfigCache } from "prettier";
import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";

const Settings = () => {
  const { mutate: setOptions } = api.options.update.useMutation();

  const { data: options, refetch: refetchOptions } =
    api.options.getAll.useQuery();

  return (
    <div>
      <div className="flex items-center justify-center pt-10">
        <div className="flex space-x-4">
          <div className="card card-normal w-96 bg-base-300">
            <div className="card-body">
              <h2 className="card-title flex justify-center">Site Settings</h2>
              <div className="flex items-center">
                <p>Enable user registration?</p>
                <input
                  type="checkbox"
                  checked={options?.enableRegistration}
                  className="checkbox-primary checkbox"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setOptions(
                      { enableRegistration: e.target.checked },
                      { onSuccess: () => void refetchOptions() }
                    );
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
Settings.getLayout = function getLayout(page: ReactElement) {
  return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default Settings;
