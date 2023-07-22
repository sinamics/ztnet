/* eslint-disable @typescript-eslint/no-unused-vars */
import EditableField from "~/components/elements/inputField";
import { useState, type ReactElement, useEffect } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { api } from "~/utils/api";
import { type GlobalOptions } from "@prisma/client";
import { toast } from "react-hot-toast";
import cn from "classnames";

type InviteUserTemplate = {
  inviteUserSubject: string;
  inviteUserBody: string;
  // other properties...
};

const Settings = () => {
  const [emailTemplate, setEmailTemplate] = useState({
    inviteUserSubject: "",
    inviteUserBody: "",
  });
  const [changes, setChanges] = useState({
    inviteUserSubject: false,
    inviteUserBody: false,
  });

  const { mutate: setRegistration } = api.admin.registration.useMutation();

  const { mutate: setMailOptions } = api.admin.setMail.useMutation();
  const { mutate: sendTestMail, isLoading: sendingMailLoading } =
    api.admin.sendTestMail.useMutation({
      onError: (err) => {
        toast.error(err.message);
      },
      onSuccess: () => {
        toast.success("Mail sent");
      },
    });
  const { mutate: setMailTemplates } = api.admin.setMailTemplates.useMutation();
  const { data: mailTemplates, refetch: refetchMailTemplates } =
    api.admin.getMailTemplates.useQuery();

  const { mutate: getDefaultMailTemplate, data: defaultTemplates } =
    api.admin.getDefaultMailTemplate.useMutation();

  const {
    data: options,
    refetch: refetchOptions,
    isLoading: loadingOptions,
  } = api.admin.getAllOptions.useQuery();

  useEffect(() => {
    if (!defaultTemplates) return;
    setEmailTemplate(defaultTemplates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTemplates]);

  useEffect(() => {
    const inviteUserTemplate =
      mailTemplates?.inviteUserTemplate as InviteUserTemplate;
    setEmailTemplate(inviteUserTemplate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mailTemplates]);

  useEffect(() => {
    const keysToCompare = ["inviteUserSubject", "inviteUserBody"]; // Add more keys as needed

    const inviteUserTemplate =
      mailTemplates?.inviteUserTemplate as InviteUserTemplate;
    if (!inviteUserTemplate || !emailTemplate) return;

    const newChanges = keysToCompare.reduce(
      (acc, key) => {
        const val1 = inviteUserTemplate?.[key];
        const val2 = emailTemplate[key];

        // Here we just compare strings directly, you could add more complex comparison logic if needed
        acc[key] = val1 !== val2;

        return acc;
      },
      { inviteUserSubject: false, inviteUserBody: false }
    );

    setChanges(newChanges);
  }, [mailTemplates?.inviteUserTemplate, emailTemplate]);

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
  const changeTemplateHandler = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    const modifiedValue = e.target.value.replace(/\n/g, "<br />");
    setEmailTemplate({
      ...emailTemplate,
      [e.target.name]: modifiedValue,
    });
  };
  const submitTemplateHandler = () => {
    if (!emailTemplate.inviteUserSubject || !emailTemplate.inviteUserBody) {
      return toast.error("Please fill all fields");
    }
    console.log(emailTemplate);
    setMailTemplates(
      {
        template: JSON.stringify(emailTemplate),
      },
      {
        onSuccess: () => {
          toast.success("Template saved");
          void refetchMailTemplates();
        },
      }
    );
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
  const inviteUserTemplate =
    mailTemplates?.inviteUserTemplate as InviteUserTemplate;

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
          <p className="text-xs">
            Available Tags:{" "}
            <span className="text-primary">toEmail, nwid, fromName</span>
          </p>
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Subject</span>
            </label>
            <input
              type="text"
              placeholder="Subject"
              name="inviteUserSubject"
              className={cn("input input-bordered w-full focus:outline-none", {
                "border-2 border-red-500": changes.inviteUserSubject,
              })}
              defaultValue={
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                inviteUserTemplate.inviteUserSubject
              }
              onChange={changeTemplateHandler}
            />
          </div>
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">HTML Body</span>
            </label>
            <textarea
              value={emailTemplate.inviteUserBody?.replace(/<br \/>/g, "\n")}
              defaultValue={inviteUserTemplate?.inviteUserBody?.replace(
                /<br \/>/g,
                "\n"
              )}
              className={cn(
                "custom-scrollbar textarea textarea-bordered w-full border-2 font-medium leading-snug focus:outline-none",
                { "border-2 border-red-500": changes.inviteUserBody }
              )}
              placeholder="Mail Template"
              rows={10}
              name="inviteUserBody"
              onChange={changeTemplateHandler}
            ></textarea>
          </div>
        </div>
        <div className="flex justify-between p-5">
          <div className="space-x-2">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => submitTemplateHandler()}
            >
              Save Template
            </button>
            <button
              className="btn btn-sm"
              onClick={() =>
                getDefaultMailTemplate({
                  template: "inviteUserTemplate",
                })
              }
            >
              Reset
            </button>
          </div>
          <div className="flex justify-end">
            <button
              className="btn btn-sm"
              disabled={
                changes.inviteUserSubject ||
                changes.inviteUserBody ||
                sendingMailLoading
              }
              onClick={() => sendTestMail({ template: "inviteUser" })}
            >
              {sendingMailLoading ? "Working..." : "Send Test Mail"}
            </button>
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
