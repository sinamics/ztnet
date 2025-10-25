import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "Rest Api/Organization/Organization/ztnet-organization-rest-api",
    },
    {
      type: "category",
      label: "UNTAGGED",
      items: [
        {
          type: "doc",
          id: "Rest Api/Organization/Organization/get-organization",
          label: "Returns a list of Organizations you have access to.",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "Rest Api/Organization/Organization/get-organization-info",
          label: "Returns information of the specified Organization.",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
