import { useRouter } from "next/router";
import { type ChangeEvent, useState } from "react";
import { toast } from "react-hot-toast";
import { api } from "~/utils/api";
import { type ErrorData } from "~/types/errorHandling";
import { useTranslations } from "next-intl";

type User = {
  email: string;
};
interface ZodErrorIssue {
  message: string;
  // Include other properties of the issue object if necessary.
}
interface ZodErrorFieldErrors {
  [key: string]: ZodErrorIssue[];
}

export const InviteMemberByMail = () => {
  const t = useTranslations("networkById");
  const [user, setUser] = useState<User>({ email: "" });
  const { query } = useRouter();

  const { mutate: invite, isLoading: loadingInvite } =
    api.network.inviteUserByMail.useMutation({
      onError: (error) => {
        if ((error.data as ErrorData)?.zodError) {
          const fieldErrors = (error.data as ErrorData)?.zodError
            .fieldErrors as ZodErrorFieldErrors;
          for (const field in fieldErrors) {
            toast.error(`${fieldErrors[field].join(", ")}`);
          }
        } else if (error.message) {
          toast.error(error.message);
        } else {
          toast.error(t("inviteMemberByMail.errorMessage.unknownError"));
        }
      },
    });

  const inputHandler = (event: ChangeEvent<HTMLInputElement>) => {
    setUser({
      ...user,
      [event.target.name]: event.target.value,
    });
  };

  return (
    <form>
      <div className="form-control">
        <label className="label">
          <span className="label-text">
            {t("inviteMemberByMail.labelText")}
          </span>
        </label>
        <label className="input-group">
          <span>{t("inviteMemberByMail.title")}</span>
          <input
            onChange={inputHandler}
            name="email"
            value={user.email}
            type="email"
            placeholder={t("inviteMemberByMail.placeholder")}
            className="input join-item input-bordered"
          />
          <button
            className="btn join-item"
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              invite(
                {
                  email: user.email,
                  nwid: query.id as string,
                },
                {
                  onSuccess: () => {
                    setUser({ email: "" });
                    toast.success(
                      t("inviteMemberByMail.successMessage", {
                        email: user.email,
                      }),
                      { duration: 10000 }
                    );
                  },
                }
              );
            }}
          >
            {loadingInvite ? (
              <span className="loading loading-spinner"></span>
            ) : (
              <>{t("inviteMemberByMail.buttonText")}</>
            )}
          </button>
        </label>
      </div>
    </form>
  );
};
