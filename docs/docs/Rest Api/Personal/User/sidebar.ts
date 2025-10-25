import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "Rest Api/Personal/User/ztnet-user-rest-api",
    },
    {
      type: "category",
      label: "Users API",
      items: [
        {
          type: "doc",
          id: "Rest Api/Personal/User/post-new-user",
          label: "Create a new user",
          className: "api-method post",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
