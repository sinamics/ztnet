/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from "react";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import cn from "classnames";

type InviteUserTemplate = {
  subject: string;
  body: string;
  // other properties...
};

const MailUserInviteTemplate = () => {
  const [changes, setChanges] = useState({
    subject: false,
    body: false,
  });

  const [emailTemplate, setEmailTemplate] = useState({
    subject: "",
    body: "",
  });
  const changeTemplateHandler = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    const modifiedValue = e.target.value.replace(/\n/g, "<br />");
    setEmailTemplate({
      ...emailTemplate,
      [e.target.name]: modifiedValue,
    });
  };
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
    api.admin.getMailTemplates.useQuery({
      template: "inviteUserTemplate",
    });

  const { mutate: getDefaultMailTemplate, data: defaultTemplates } =
    api.admin.getDefaultMailTemplate.useMutation();

  useEffect(() => {
    if (!defaultTemplates) return;
    setEmailTemplate(defaultTemplates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTemplates]);

  useEffect(() => {
    const template = mailTemplates as InviteUserTemplate;
    setEmailTemplate(template);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mailTemplates]);

  useEffect(() => {
    const keysToCompare = ["subject", "body"]; // Add more keys as needed

    const template = mailTemplates as InviteUserTemplate;
    if (!template || !emailTemplate) return;

    const newChanges = keysToCompare.reduce(
      (acc, key) => {
        const val1 = template?.[key] as string;
        const val2 = emailTemplate[key] as string;

        // Here we just compare strings directly, you could add more complex comparison logic if needed
        acc[key] = val1 !== val2;

        return acc;
      },
      { subject: false, body: false }
    );

    setChanges(newChanges);
  }, [mailTemplates, emailTemplate]);
  const submitTemplateHandler = () => {
    if (!emailTemplate.subject || !emailTemplate.body) {
      return toast.error("Please fill all fields");
    }

    setMailTemplates(
      {
        template: JSON.stringify(emailTemplate),
        type: "inviteUserTemplate",
      },
      {
        onSuccess: () => {
          toast.success("Template saved");
          void refetchMailTemplates();
        },
      }
    );
  };
  const mailTemplate = mailTemplates as InviteUserTemplate;
  return (
    <div>
      <div className="space-y-3">
        <p className="font-medium">
          Available tags:
          <span className="text-primary"> toEmail, nwid, fromName</span>
        </p>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Subject</span>
          </label>
          <input
            type="text"
            placeholder="Subject"
            value={emailTemplate?.subject}
            defaultValue={
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              mailTemplate?.subject
            }
            name="subject"
            className={cn("input input-bordered w-full focus:outline-none", {
              "border-2 border-red-500": changes?.subject,
            })}
            onChange={changeTemplateHandler}
          />
        </div>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">HTML Body</span>
          </label>
          <textarea
            value={emailTemplate?.body?.replace(/<br \/>/g, "\n")}
            defaultValue={mailTemplate?.body?.replace(/<br \/>/g, "\n")}
            className={cn(
              "custom-scrollbar textarea textarea-bordered w-full border-2 font-medium leading-snug focus:outline-none",
              { "border-2 border-red-500": changes.body }
            )}
            placeholder="Mail Template"
            rows={10}
            name="body"
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
            disabled={changes.subject || changes.body || sendingMailLoading}
            onClick={() => sendTestMail({ type: "inviteUserTemplate" })}
          >
            {sendingMailLoading ? "Working..." : "Send Test Mail"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MailUserInviteTemplate;
