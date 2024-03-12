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
  trailingSlash: false,
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
    '@stackql/docusaurus-plugin-structured-data',
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: "api", // plugin id
        docsPluginId: "classic", // id of plugin-content-docs or preset for rendering docs
        config: {
          // Personal Controller
          personal_user: {
            specPath: "docs/Rest Api/Personal/_source/user.yml", // path to OpenAPI spec, URLs supported
            outputDir: "docs/Rest Api/Personal/User", // output directory for generated files
            sidebarOptions: { // optional, instructs plugin to generate sidebar.js
              groupPathsBy: "tag", // group sidebar items by operation "tag"
            },
          },
          personal_network: { // the <id> for network
            specPath: "docs/Rest Api/Personal/_source/network.yml", // path to OpenAPI spec, URLs supported
            outputDir: "docs/Rest Api/Personal/Network", // output directory for network files
            sidebarOptions: { // optional, instructs plugin to generate sidebar.js
              groupPathsBy: "tag", // group sidebar items by operation "tag"
            },
          },
          personal_network_member: { // the <id> for network
            specPath: "docs/Rest Api/Personal/_source/networkMember.yml", // path to OpenAPI spec, URLs supported
            outputDir: "docs/Rest Api/Personal/Network-Members", // output directory for network files
            sidebarOptions: { // optional, instructs plugin to generate sidebar.js
              groupPathsBy: "tag", // group sidebar items by operation "tag"
            },
          },

          // Organization Controller
          organization: {
            specPath: "docs/Rest Api/Organization/_source/organization.yml", // path to OpenAPI spec, URLs supported
            outputDir: "docs/Rest Api/Organization/Organization", // output directory for generated files
            sidebarOptions: { // optional, instructs plugin to generate sidebar.js
              groupPathsBy: "tag", // group sidebar items by operation "tag"
            },
          },
          organization_users: {
            specPath: "docs/Rest Api/Organization/_source/users.yml", // path to OpenAPI spec, URLs supported
            outputDir: "docs/Rest Api/Organization/Users", // output directory for generated files
            sidebarOptions: { // optional, instructs plugin to generate sidebar.js
              groupPathsBy: "tag", // group sidebar items by operation "tag"
            },
          },
          organization_network: {
            specPath: "docs/Rest Api/Organization/_source/network.yml", // path to OpenAPI spec, URLs supported
            outputDir: "docs/Rest Api/Organization/Network", // output directory for generated files
            sidebarOptions: { // optional, instructs plugin to generate sidebar.js
              groupPathsBy: "tag", // group sidebar items by operation "tag"
            },
          },
          organization_network_member: {
            specPath: "docs/Rest Api/Organization/_source/networkMember.yml", // path to OpenAPI spec, URLs supported
            outputDir: "docs/Rest Api/Organization/Network-Members", // output directory for generated files
            sidebarOptions: { // optional, instructs plugin to generate sidebar.js
              groupPathsBy: "tag", // group sidebar items by operation "tag"
            },
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
            // label: 'GitHub',
            position: 'right',
            html: `
            <div title="Github Repo">
              <svg style="margin-top:5px" xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
              </svg>
            </div>
            `
            
          },
          {
            // label: 'Discord',
            href: 'https://discord.gg/VafvyXvY58',
            position: 'right',
            className: 'header-discord-link',
            html: `
            <div title="Join Our Discord Server">
              <svg style="margin-top:5px; margin-right:30px;" xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.545 2.907a13.227 13.227 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 0 0-3.658 0 8.258 8.258 0 0 0-.412-.833.051.051 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.041.041 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019c.308-.42.582-.863.818-1.329a.05.05 0 0 0-.01-.059.051.051 0 0 0-.018-.011 8.875 8.875 0 0 1-1.248-.595.05.05 0 0 1-.02-.066.051.051 0 0 1 .015-.019c.084-.063.168-.129.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.052.052 0 0 1 .053.007c.08.066.164.132.248.195a.051.051 0 0 1-.004.085 8.254 8.254 0 0 1-1.249.594.05.05 0 0 0-.03.03.052.052 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.235 13.235 0 0 0 4.001-2.02.049.049 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 0 0-.02-.019Zm-8.198 7.307c-.789 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/>
              </svg>
            </div>
          `,
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
      structuredData: {
        excludedRoutes: [
          '/providers',
        ],
        verbose: false,
        featuredImageDimensions: {
          width: 1200,
          height: 627,
        },
        authors:{
          'Bernt Christian Egeland': {
            authorId: '1',
            url: 'https://www.linkedin.com/in/bernt-christian-egeland/',
            imageUrl: 'https://2.gravatar.com/avatar/231d0674ec90dab3e28b61a55b81d615dd2657f6daa34a4cf897f65e00e1167d?size=128',
            sameAs: [
              'https://egeland.io',
              'https://github.com/sinamics',
              'https://twitter.com/BerntChris',
              'https://www.linkedin.com/in/bernt-christian-egeland/',
              // Add any other sameAs links relevant to you
            ],
          },
        },
        // organization: {
        //   sameAs: [
        //     'https://twitter.com/your-org-twitter',
        //     'https://www.linkedin.com/company/your-org-linkedin',
        //     'https://github.com/your-org-github',
        //     // Add any other sameAs links relevant to your organization
        //   ],
        //   contactPoint: {
        //     '@type': 'ContactPoint',
        //     email: 'info@your-org-email.com',
        //   },
        //   logo: {
        //     '@type': 'ImageObject',
        //     inLanguage: 'en-US',
        //     '@id': 'https://your-org-website.com/#logo',
        //     url: 'https://your-org-website.com/logo.png',
        //     contentUrl: 'https://your-org-website.com/logo.png',
        //     width: 1200,
        //     height: 627,
        //     caption: 'Your Organization - Caption Here',
        //   },
        //   address: {
        //     '@type': 'PostalAddress',
        //     addressCountry: 'NO',
        //     postalCode: 'Your Postal Code',
        //     streetAddress: 'Your Street Address',
        //   },
        //   duns: 'Your DUNS Number',
        //   taxID: 'Your Tax ID',
        // },
        website: {
          inLanguage: 'en-US',
        },
        webpage: {
          inLanguage: 'en-US',
          datePublished: '2023-11.04',
        },
        breadcrumbLabelMap: {
          // Update this map to reflect the structure and labels of your Docusaurus site
        }
      },
      
    }),
};

module.exports = config;
