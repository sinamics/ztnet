import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "Rest Api/Organization/Network/ztnet-organization-network-rest-api",
    },
    {
      type: "category",
      label: "UNTAGGED",
      items: [
        {
          type: "doc",
          id: "Rest Api/Organization/Network/get-user-networks",
          label: "Returns a list of Networks in the Organization you have access to",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "Rest Api/Organization/Network/create-new-network",
          label: "Create New Network within the Organization",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "Rest Api/Organization/Network/get-network-info",
          label: "Returns information about a specific organization network",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "Rest Api/Organization/Network/update-network-info",
          label: "Update a specific organization network",
          className: "api-method post",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
