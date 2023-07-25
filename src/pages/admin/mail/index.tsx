/* eslint-disable @typescript-eslint/no-unused-vars */
import EditableField from "~/components/elements/inputField";
import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { type GlobalOptions } from "@prisma/client";
import MailUserInviteTemplate from "~/components/modules/mailUserInviteTemplate";
import ForgotPasswordMailTemplate from "~/components/modules/mailForgotPasswordTemplate";
import NotificationTemplate from "~/components/modules/mailNotificationTemplate";

const Mail = () => {
  const { mutate: setMailOptions } = api.admin.setMail.useMutation();

  const {
    data: options,
    refetch: refetchOptions,
    isLoading: loadingOptions,
  } = api.admin.getAllOptions.useQuery();

  const inputHandler = (e: Partial<GlobalOptions>) => {
    return new Promise((resolve, reject) => {
      setMailOptions(e, {
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
    <main className="mx-auto flex w-full flex-col justify-center space-y-5 bg-base-100 p-3 sm:w-6/12">
      <div>
        <p className="text-sm text-gray-400">Mail SMTP</p>
        <div className="divider mt-0 text-gray-500"></div>
      </div>

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
        <div className="flex items-center justify-between pb-10">
          <p className="font-medium">Use SSL</p>
          <input
            type="checkbox"
            checked={options?.smtpUseSSL || false}
            className="checkbox-primary checkbox checkbox-sm"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              void inputHandler({ smtpUseSSL: e.target.checked });
            }}
          />
        </div>
        <div
          tabIndex={0}
          className="collapse-arrow collapse w-full border border-base-300 bg-base-200"
        >
          <input type="checkbox" />
          <div className="collapse-title">Invite user template</div>
          <div className="collapse-content" style={{ width: "100%" }}>
            <MailUserInviteTemplate />
          </div>
        </div>
        <div
          tabIndex={0}
          className="collapse-arrow collapse w-full border border-base-300 bg-base-200"
        >
          <input type="checkbox" />
          <div className="collapse-title">Forgot Password template</div>
          <div className="collapse-content" style={{ width: "100%" }}>
            <ForgotPasswordMailTemplate />
          </div>
        </div>
        <div
          tabIndex={0}
          className="collapse-arrow collapse w-full border border-base-300 bg-base-200"
        >
          <input type="checkbox" />
          <div className="collapse-title">Notification template</div>
          <div className="collapse-content" style={{ width: "100%" }}>
            <NotificationTemplate />
          </div>
        </div>
      </div>
    </main>
  );
};
Mail.getLayout = function getLayout(page: ReactElement) {
  return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default Mail;
