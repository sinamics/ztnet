import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "Rest Api/Personal/Network-Members/ztnet-network-member-rest-api",
    },
    {
      type: "category",
      label: "UNTAGGED",
      items: [
        {
          type: "doc",
          id: "Rest Api/Personal/Network-Members/get-network-member-info",
          label: "Returns a list of Members on the network",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "Rest Api/Personal/Network-Members/modify-a-network-member",
          label: "Modify a network member",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "Rest Api/Personal/Network-Members/delete-network-member",
          label: "Delete a network member",
          className: "api-method delete",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
