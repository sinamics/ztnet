import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "Rest Api/Personal/Network/ztnet-network-rest-api",
    },
    {
      type: "category",
      label: "UNTAGGED",
      items: [
        {
          type: "doc",
          id: "Rest Api/Personal/Network/get-user-networks",
          label: "Returns a list of Networks you have access to",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "Rest Api/Personal/Network/create-new-network",
          label: "Create New Network",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "Rest Api/Personal/Network/get-network-info",
          label: "Returns information about a specific network",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
