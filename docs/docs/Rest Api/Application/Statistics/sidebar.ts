import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "Rest Api/Application/Statistics/ztnet-statistics-rest-api",
    },
    {
      type: "category",
      label: "UNTAGGED",
      items: [
        {
          type: "doc",
          id: "Rest Api/Application/Statistics/get-app-stats",
          label: "Returns statistics for ztnet",
          className: "api-method get",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
