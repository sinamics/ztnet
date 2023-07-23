import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";

const Notification = () => {
  const { mutate: setRegistration } =
    api.admin.updateGlobalOptions.useMutation();
  const {
    data: options,
    refetch: refetchOptions,
    isLoading: loadingOptions,
  } = api.admin.getAllOptions.useQuery();

  return (
    <main className="mx-auto flex w-full flex-col justify-center space-y-5 bg-base-100 p-3 sm:w-6/12">
      <div className="pb-10">
        <p className="text-sm text-gray-400">Authentication</p>
        <div className="divider mt-0 p-0 text-gray-500"></div>
        <div className="flex items-center justify-between">
          <div>
            <p>When a user register</p>
            <p className="text-xs text-gray-500">
              All Admins will get notifications
            </p>
          </div>
          <input
            type="checkbox"
            disabled={loadingOptions}
            checked={options?.userRegistrationNotification || false}
            className="checkbox-primary checkbox checkbox-sm"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setRegistration(
                { userRegistrationNotification: e.target.checked },
                { onSuccess: () => void refetchOptions() }
              );
            }}
          />
        </div>
      </div>
    </main>
  );
};

Notification.getLayout = function getLayout(page: ReactElement) {
  return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};
export default Notification;
