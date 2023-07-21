/* eslint-disable @typescript-eslint/no-unused-vars */
import EditableField from "~/components/elements/inputField";
import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { type GlobalOptions } from "@prisma/client";

const Settings = () => {
  const { mutate: setRegistration } = api.admin.registration.useMutation();

  const { mutate: setMailMutation } = api.admin.setMail.useMutation();

  const {
    data: options,
    refetch: refetchOptions,
    isLoading: loadingOptions,
  } = api.admin.getAllOptions.useQuery();

  const inputHandler = (e: Partial<GlobalOptions>) => {
    return new Promise((resolve, reject) => {
      setMailMutation(e, {
        onSuccess: () => {
          void refetchOptions();
          resolve({ success: true });
        },
      });
    });
  };

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
    <main className="w-full bg-base-100 md:flex">
      <div className="px-4 md:w-4/12">
        <div className="mt-6 overflow-hidden rounded-lg bg-base-300 px-4">
          <h2 className="px-4 pt-5 text-lg font-medium ">Site</h2>
          <div className="divider" />
          <div className="px-4 py-5 sm:py-4">
            <div className="flex items-center justify-between">
              <p>Enable user registration?</p>
              <input
                type="checkbox"
                checked={options?.enableRegistration}
                className="checkbox-primary checkbox"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setRegistration(
                    { enableRegistration: e.target.checked },
                    { onSuccess: () => void refetchOptions() }
                  );
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Column 2  */}
      <div className="px-4 md:w-4/12">
        <div className="mt-6 overflow-hidden rounded-lg bg-base-300 px-4">
          <h2 className="px-4 pt-5 text-lg font-medium ">Mail</h2>
          <div className="divider" />
          <div className="space-y-2 px-4 py-5 sm:py-4">
            <div className="flex items-center justify-between">
              <EditableField
                isLoading={false}
                label="SMTP Host"
                buttonClassName="hidden"
                size="xs"
                fields={[
                  {
                    name: "smtpHost",
                    type: "text",
                    placeholder: options?.smtpHost || "host.smtp.com",
                    defaultValue: options?.smtpHost,
                  },
                ]}
                submitHandler={async (params) => await inputHandler(params)}
              />
            </div>
            <div className="flex items-center justify-between">
              <EditableField
                isLoading={false}
                label="SMTP Port"
                buttonClassName="hidden"
                size="xs"
                fields={[
                  {
                    name: "smtpPort",
                    type: "number",
                    placeholder: options?.smtpPort || "587",
                    defaultValue: options?.smtpPort,
                  },
                ]}
                submitHandler={(params) => inputHandler(params)}
              />
            </div>
            <div className="flex items-center justify-between">
              <EditableField
                isLoading={false}
                label="Sender Email"
                buttonClassName="hidden"
                size="xs"
                fields={[
                  {
                    name: "email",
                    type: "text",
                    placeholder: options?.email || "mail@example.com",
                    defaultValue: options?.email,
                  },
                ]}
                submitHandler={(params) => inputHandler(params)}
              />
            </div>
            <div className="flex items-center justify-between">
              <EditableField
                isLoading={false}
                label="Username"
                buttonClassName="hidden"
                size="xs"
                fields={[
                  {
                    name: "username",
                    type: "text",
                    placeholder: options?.username || "username",
                    defaultValue: options?.username,
                  },
                ]}
                submitHandler={(params) => inputHandler(params)}
              />
            </div>
            <div className="flex items-center justify-between">
              <EditableField
                isLoading={false}
                label="Password"
                buttonClassName="hidden"
                size="xs"
                fields={[
                  {
                    name: "email",
                    type: "password",
                    placeholder: "******",
                    defaultValue: options?.password,
                  },
                ]}
                submitHandler={(params) => inputHandler(params)}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Use SSL</p>
              <input
                type="checkbox"
                checked={options?.useSSL}
                className="checkbox-primary checkbox checkbox-sm"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  void inputHandler({ useSSL: e.target.checked });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
Settings.getLayout = function getLayout(page: ReactElement) {
  return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default Settings;
