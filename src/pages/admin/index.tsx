import React, { type ReactElement } from "react";
import { useRouter } from "next/router";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import Members from "./members";
import Controller from "./controller";
import Settings from "./settings";
import Mail from "./mail";
import Notification from "./notification";
import NetworkSettings from "./network";
import { useTranslation } from "react-i18next";

const AdminSettings = () => {
  const router = useRouter();
  const { tab = "members" } = router.query;
  const { t } = useTranslation();
  interface ITab {
    name: string;
    value: string;
    component: ReactElement;
  }

  const tabs: ITab[] = [
    {
      name: t("admin.tabs.settings"),
      value: "site-setting",
      component: <Settings />,
    },
    {
      name: t("admin.tabs.network"),
      value: "network-setting",
      component: <NetworkSettings />,
    },
    {
      name: t("admin.tabs.mail"),
      value: "mail-setting",
      component: <Mail />,
    },
    {
      name: t("admin.tabs.users"),
      value: "users",
      component: <Members />,
    },
    {
      name: t("admin.tabs.notification"),
      value: "notification",
      component: <Notification />,
    },
    {
      name: t("admin.tabs.controller"),
      value: "controller",
      component: <Controller />,
    },
  ];

  const changeTab = async (tab: ITab) => {
    await router.push({
      pathname: "/admin",
      query: { tab: tab.value },
    });
  };
  return (
    <div className="py-5">
      <div className="tabs mx-auto w-full p-3 pb-10 sm:w-6/12">
        {tabs.map((t) => (
          <a
            key={t.value}
            onClick={() => void changeTab(t)}
            className={`text-md tab tab-bordered ${
              t.value === tab ? "tab-active" : ""
            }`}
          >
            {t.name}
          </a>
        ))}
      </div>
      {tabs.find((t) => t.value === tab)?.component}
    </div>
  );
};

AdminSettings.getLayout = function getLayout(page: ReactElement) {
  return <LayoutAuthenticated>{page}</LayoutAuthenticated>;
};

export default AdminSettings;
