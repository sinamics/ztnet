import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "Rest Api/Organization/Users/ztnet-organization-user-rest-api",
    },
    {
      type: "category",
      label: "Organization Users",
      items: [
        {
          type: "doc",
          id: "Rest Api/Organization/Users/get-organization-users",
          label: "Returns a list of Users in the organization",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
