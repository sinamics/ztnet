import React, { ReactElement, useState } from "react";
import { useRouter } from "next/router";
import { LayoutAuthenticated } from "~/components/layouts/layout";
import Members from "./members";
import Controller from "./controller";
import Settings from "./settings";
import Mail from "./mail";

const AdminSettings = () => {
  const router = useRouter();
  const { tab = "members" } = router.query;

  const tabs = [
    {
      name: "Settings",
      value: "site-setting",
      component: <Settings />,
    },
    {
      name: "Mail",
      value: "mail",
      component: <Mail />,
    },
    {
      name: "Members",
      value: "members",
      component: <Members />,
    },
    { name: "Controller", value: "controller", component: <Controller /> },
  ];

  const changeTab = async (tab) => {
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
            onClick={() => changeTab(t)}
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
