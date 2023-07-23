import { useState, useEffect } from "react";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import cn from "classnames";

type IMailTemplate = {
  subject: string;
  body: string;
};

const NotificationTemplate = () => {
  const [changes, setChanges] = useState({
    subject: false,
    body: false,
  });

  const [stateTemplate, setEmailTemplate] = useState({
    subject: "",
    body: "",
  });

  const changeTemplateHandler = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    const modifiedValue = e.target.value.replace(/\n/g, "<br />");
    setEmailTemplate({
      ...stateTemplate,
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

  // get default mail template
  const { data: mailTemplates, refetch: refetchMailTemplates } =
    api.admin.getMailTemplates.useQuery({
      template: "notificationTemplate",
    });

  const { mutate: getDefaultMailTemplate, data: defaultTemplates } =
    api.admin.getDefaultMailTemplate.useMutation();

  useEffect(() => {
    if (!defaultTemplates) return;
    setEmailTemplate(defaultTemplates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTemplates]);

  useEffect(() => {
    const notificationTemplate = mailTemplates as IMailTemplate;
    setEmailTemplate(notificationTemplate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mailTemplates]);

  useEffect(() => {
    const keysToCompare = ["subject", "body"];

    const _mailTemplate = mailTemplates as IMailTemplate;
    if (!_mailTemplate || !stateTemplate) return;

    const newChanges = keysToCompare.reduce(
      (acc, key) => {
        const val1 = _mailTemplate?.[key] as string;
        const val2 = stateTemplate[key] as string;

        // Here we just compare strings directly
        acc[key] = val1 !== val2;

        return acc;
      },
      { subject: false, body: false }
    );

    setChanges(newChanges);
  }, [mailTemplates, stateTemplate]);

  const submitTemplateHandler = () => {
    if (!stateTemplate.subject || !stateTemplate.body) {
      return toast.error("Please fill all fields");
    }

    setMailTemplates(
      {
        template: JSON.stringify(stateTemplate),
        type: "notificationTemplate",
      },
      {
        onSuccess: () => {
          toast.success("Template saved");
          void refetchMailTemplates();
        },
      }
    );
  };

  return (
    <div>
      <div className="space-y-3">
        <p className="font-medium">
          Available tags:
          <span className="text-primary"> toName notificationMessage</span>
        </p>
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Subject</span>
          </label>
          <input
            type="text"
            placeholder="Subject"
            value={stateTemplate?.subject}
            defaultValue={
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              (mailTemplates as IMailTemplate)?.subject
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
            value={stateTemplate?.body?.replace(/<br \/>/g, "\n")}
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
                template: "notificationTemplate",
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
            onClick={() => sendTestMail({ type: "notificationTemplate" })}
          >
            {sendingMailLoading ? "Working..." : "Send Test Mail"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationTemplate;
