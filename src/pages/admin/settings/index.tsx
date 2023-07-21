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
  console.log(options);
  return (
    <main className="mx-auto flex w-full flex-col justify-center space-y-5 bg-base-100 p-3 sm:w-6/12">
      <div className="pb-10">
        <div className="divider text-gray-500">Authentication</div>
        <div className="flex items-center justify-between">
          <p>Enable user registration?</p>
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
      <div className="divider text-gray-500">Mail</div>
      <div className="space-y-1">
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
                name: "smtpEmail",
                type: "text",
                placeholder: options?.smtpEmail || "mail@example.com",
                defaultValue: options?.smtpEmail,
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
                name: "smtpUsername",
                type: "text",
                placeholder: options?.smtpUsername || "username",
                defaultValue: options?.smtpUsername,
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
                name: "smtpPassword",
                type: "password",
                placeholder: "******",
                defaultValue: options?.smtpPassword,
              },
            ]}
            submitHandler={(params) => inputHandler(params)}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="font-medium">Use SSL</p>
          <input
            type="checkbox"
            checked={options?.smtpUseSSL}
            className="checkbox-primary checkbox checkbox-sm"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              void inputHandler({ smtpUseSSL: e.target.checked });
            }}
          />
        </div>
        <div className="p-5">
          <p className="font-medium">Invite user template</p>
          <textarea
            className="textarea textarea-bordered textarea-sm w-full font-medium"
            placeholder="Mail Template"
          ></textarea>
        </div>
      </div>
    </main>
  );
};
Settings.getLayout = function getLayout(page: ReactElement) {
  return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default Settings;
