import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "Rest Api/Organization/Network-Members/ztnet-organization-network-member-rest-api",
    },
    {
      type: "category",
      label: "UNTAGGED",
      items: [
        {
          type: "doc",
          id: "Rest Api/Organization/Network-Members/get-network-member-info",
          label: "Returns a list of Members in a organization network",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "Rest Api/Organization/Network-Members/get-network-member-by-id-info",
          label: "Returns a specific organization network member",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "Rest Api/Organization/Network-Members/modify-a-organization-network-member",
          label: "Modify a organization network member",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "Rest Api/Organization/Network-Members/delete-network-member",
          label: "Delete a organization network member",
          className: "api-method delete",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
