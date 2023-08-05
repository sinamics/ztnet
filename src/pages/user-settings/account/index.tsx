import { type ReactElement } from "react";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import { useSession } from "next-auth/react";
import { api } from "~/utils/api";
import { toast } from "react-hot-toast";
import InputField from "~/components/elements/inputField";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";

const languageNames = {
  en: "English",
  no: "Norwegian",
  zh: "Chinese",
  es: "Spanish",
};

const Account = () => {
  const { asPath, locale, locales, push } = useRouter();
  const t = useTranslations("userSettings");

  const { data: session, update: sessionUpdate } = useSession();
  const { mutate: userUpdate, error: userError } =
    api.auth.update.useMutation();

  const { mutate: updateZtApi } = api.settings.setZtApi.useMutation({
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const { data: globalOption, refetch: refetchOptions } =
    api.admin.getAllOptions.useQuery();

  const ChangeLanguage = async (locale: string) => {
    await push(asPath, asPath, { locale });
    localStorage.setItem("ztnet-language", locale);
  };
  if (userError) {
    toast.error(userError.message);
  }
  return (
    <main className="mx-auto flex w-full flex-col justify-center space-y-5 bg-base-100 p-3 sm:w-6/12">
      <div className="pb-10">
        <p className="text-[0.7rem] text-gray-400">
          {t("account.accountSettings")}
        </p>
        <div className="divider mt-0 p-0 text-gray-500"></div>
        <div className="space-y-10">
          <div>
            <InputField
              label={t("account.nameLabel")}
              isLoading={!session?.user}
              rootClassName=""
              size="sm"
              fields={[
                {
                  name: "name",
                  type: "text",
                  placeholder: session?.user?.name,
                  value: session?.user?.name,
                },
              ]}
              submitHandler={async (params) =>
                await sessionUpdate({ update: { ...params } })
              }
            />
          </div>
          <div>
            <InputField
              label={t("account.emailLabel")}
              isLoading={!session?.user}
              rootClassName=""
              size="sm"
              badge={
                session?.user?.emailVerified
                  ? { text: t("account.verifiedBadge"), color: "success" }
                  : { text: t("account.notVerifiedBadge"), color: "warning" }
              }
              fields={[
                {
                  name: "email",
                  type: "text",
                  placeholder: session?.user?.email,
                  value: session?.user?.email,
                },
              ]}
              submitHandler={async (params) =>
                await sessionUpdate({ update: { ...params } })
              }
            />
          </div>
          <div>
            <InputField
              isLoading={!session?.user}
              label={t("account.passwordLabel")}
              placeholder="******"
              size="sm"
              rootFormClassName="space-y-3 pt-2"
              fields={[
                {
                  name: "password",
                  type: "password",
                  placeholder: t("account.currentPasswordPlaceholder"),
                },
                {
                  name: "newPassword",
                  type: "password",
                  placeholder: t("account.newPasswordPlaceholder"),
                },
                {
                  name: "repeatNewPassword",
                  type: "password",
                  placeholder: t("account.repeatNewPasswordPlaceholder"),
                },
              ]}
              submitHandler={(params) => {
                return new Promise((resolve, reject) => {
                  userUpdate(
                    { ...params },
                    {
                      onSuccess: () => {
                        resolve(true);
                      },
                      onError: () => {
                        reject(false);
                      },
                    }
                  );
                });
              }}
            />
          </div>
          <div className="flex justify-between">
            <div>
              <p className="font-medium">{t("account.role")}</p>
              <p className="text-gray-500">{session?.user.role}</p>
            </div>
          </div>
        </div>

        <div className="pt-10 text-[0.7rem] text-gray-400">
          ZEROTIER CENTRAL{" "}
          <div className="badge badge-primary p-1 text-[0.6rem]">BETA</div>
        </div>
        <div className="divider m-0 p-0 text-gray-500"></div>
        <div className="form-control w-full">
          <p className="text-sm text-gray-500">
            Incorporating your ZeroTier Central API will enable you to manage
            your central networks directly from ZTNET. Upon integrating the key,
            a new menu will appear in the sidebar for enhanced accessibility and
            control.
            <br />
            You can obtain a key from the ZeroTier Central portal.{" "}
            <a href="https://my.zerotier.com/account">
              https://my.zerotier.com/account
            </a>
          </p>
          <div className="pt-3">
            <InputField
              label="Zerotier Central API Key"
              placeholder="******"
              size="sm"
              rootFormClassName="space-y-3 pt-2"
              fields={[
                {
                  name: "ztCentralApiKey",
                  type: "text",
                  placeholder: "api key",
                  value: globalOption?.ztCentralApiKey,
                },
              ]}
              submitHandler={(params) => {
                return new Promise((resolve, reject) => {
                  updateZtApi(
                    { ...params },
                    {
                      onSuccess: () => {
                        void refetchOptions();
                        resolve(true);
                      },
                      onError: () => {
                        void refetchOptions();
                        reject(false);
                      },
                    }
                  );
                });
              }}
            />
          </div>
        </div>
        <div className="form-control w-full">
          <div className="pt-3">
            <InputField
              label="Zerotier API Url"
              description="The url of the ZeroTier Central API, Default is https://api.zerotier.com/api/v1"
              size="sm"
              rootFormClassName="space-y-3 pt-2"
              rootClassName="py-2"
              fields={[
                {
                  name: "ztCentralApiUrl",
                  type: "text",
                  placeholder:
                    globalOption?.ztCentralApiUrl ||
                    "https://api.zerotier.com/api/v1",
                  value: globalOption?.ztCentralApiUrl,
                },
              ]}
              submitHandler={(params) => {
                return new Promise((resolve, reject) => {
                  updateZtApi(
                    { ...params },
                    {
                      onSuccess: () => {
                        void refetchOptions();
                        resolve(true);
                      },
                      onError: () => {
                        void refetchOptions();
                        reject(false);
                      },
                    }
                  );
                });
              }}
            />
          </div>
        </div>
        <p className="pt-10 text-[0.7rem] text-gray-400">
          {t("account.accountPreferences")}
        </p>
        <div className="divider mt-0 p-0 text-gray-500"></div>
        <div className="form-control w-full max-w-xs">
          <label className="label">
            <span className="label-text font-medium">
              {t("account.languageLabel")}
            </span>
          </label>
          <select
            defaultValue={locale} // use `defaultValue` here
            onChange={(e) => void ChangeLanguage(e.target.value)}
            className="select select-bordered"
          >
            {locales.map((language) => (
              <option key={language} value={language}>
                {languageNames[language]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </main>
  );
};

Account.getLayout = function getLayout(page: ReactElement) {
  return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default Account;
