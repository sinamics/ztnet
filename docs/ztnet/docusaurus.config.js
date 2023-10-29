// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
// const darkCodeTheme = require('prism-react-renderer/themes/dracula');
const darkCodeTheme = require("prism-react-renderer/themes/oceanicNext");

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'ZTNET - ZeroTier Web UI',
  tagline: 'Zerotier Controller Web UI',
  favicon: 'img/ztnet_16x16.png',

  // Set the production url of your site here
  url: 'https://ztnet.network',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'sinamics', // Usually your GitHub org/user name.
  projectName: 'ztnet', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  deploymentBranch: 'main',
  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  plugins: [
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: "api", // plugin id
        docsPluginId: "classic", // id of plugin-content-docs or preset for rendering docs
        config: {
          user: { // the <id> referenced when running CLI commands
            specPath: "docs/Api/user/api.yml", // path to OpenAPI spec, URLs supported
            outputDir: "docs/Api" // output directory for generated files
          },
        }
      },
    ]
  ],
  themes: ["docusaurus-theme-openapi-docs"], // export theme components
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          docLayoutComponent: "@theme/DocPage",
          docItemComponent: "@theme/ApiItem",
          routeBasePath: '/', // Set this value to '/'.
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/sinamics/ztnet',
        },
        gtag: {
          trackingID: 'G-K5FT4B5HF2',
          anonymizeIP: false,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/ztnet_social.png',
      metadata: [
        {name: 'viewport', content: 'width=device-width, initial-scale=1.0'},
        {name: 'title', content: 'ZTNET - Ultimate ZeroTier Web UI Network Controller'},
        {name: 'description', content: 'Manage your decentralized VPN effortlessly with ZTNET, the most advanced ZeroTier Web UI Network Controller available. Secure, scalable, and user-friendly.'},
        {name: 'keywords', content: 'ztnet,zerotier,web-ui,network-controller,VPN,decentralized,zerotier-controller,zerotier-webui,zerotier-network-controller,zerotier-web-ui,zerotier-network,zerotier-network-ui,zerotier-network-webui,'},
        {name: 'canonical', content: 'https://ztnet.network'},
        {property: 'og:type', content: 'website'},
        {property: 'og:url', content: 'https://ztnet.network'},
        {property: 'og:title', content: 'ZTNET - Ultimate ZeroTier Web UI Network Controller'},
        {property: 'og:description', content: 'Manage your decentralized VPN effortlessly with ZTNET, the most advanced ZeroTier Web UI Network Controller available. Secure, scalable, and user-friendly.'},
        {property: 'og:image', content: 'img/ztnet_social.png'},
        {property: 'twitter:card', content: 'summary_large_image'},
        {property: 'twitter:url', content: 'https://ztnet.network'},
        {property: 'twitter:title', content: 'ZTNET - Ultimate ZeroTier Web UI Network Controller'},
        {property: 'twitter:description', content: 'Manage your decentralized VPN effortlessly with ZTNET, the most advanced ZeroTier Web UI Network Controller available. Secure, scalable, and user-friendly.'},
        {property: 'twitter:image', content: 'img/ztnet_social.png'},
      ],
      navbar: {
        title: 'ZTNET',
        logo: {
          alt: 'ZTNET',
          src: 'img/ztnet_100x100.png',
          // height: '20px,
          width: '35px',
        },
        items: [
          // {
          //   type: 'docSidebar',
          //   sidebarId: 'gettingStartedSidebar',
          //   position: 'left',
          //   label: 'Get Started',
          // },
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Get Started',
          },
          // {to: '/blog', label: 'Blog', position: 'left'},
          {
            href: 'https://github.com/sinamics/ztnet',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        respectPrefersColorScheme: false,
      },
      // footer: {
      //   style: 'dark',
      //   links: [
      //     {
      //       title: 'Docs',
      //       items: [
      //         {
      //           label: 'Tutorial',
      //           to: '/docs/intro',
      //         },
      //       ],
      //     },
      //     {
      //       title: 'Community',
      //       items: [
      //         {
      //           label: 'Stack Overflow',
      //           href: 'https://stackoverflow.com/questions/tagged/docusaurus',
      //         },
      //         {
      //           label: 'Discord',
      //           href: 'https://discordapp.com/invite/docusaurus',
      //         },
      //         {
      //           label: 'Twitter',
      //           href: 'https://twitter.com/docusaurus',
      //         },
      //       ],
      //     },
      //     {
      //       title: 'More',
      //       items: [
      //         {
      //           label: 'Blog',
      //           to: '/blog',
      //         },
      //         {
      //           label: 'GitHub',
      //           href: 'https://github.com/facebook/docusaurus',
      //         },
      //       ],
      //     },
      //   ],
      //   copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`,
      // },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
