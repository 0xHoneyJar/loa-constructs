import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Constructs Network",
  description: "Documentation for the construct ecosystem",
  appearance: "dark",

  head: [
    [
      "link",
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
    ],
    [
      "link",
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossorigin: "",
      },
    ],
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap",
      },
    ],
  ],

  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Constructs", link: "/constructs/artisan" },
      { text: "Architecture", link: "/architecture/ecs" },
      { text: "Verification", link: "/verification/echelon" },
      { text: "About", link: "/network/index" },
    ],

    sidebar: {
      "/constructs/": [
        {
          text: "Constructs",
          items: [
            { text: "Artisan", link: "/constructs/artisan" },
            { text: "Beacon", link: "/constructs/beacon" },
            { text: "Crucible", link: "/constructs/crucible" },
            { text: "Dynamic Auth", link: "/constructs/dynamic-auth" },
            { text: "Gecko", link: "/constructs/gecko" },
            { text: "Growthpages", link: "/constructs/growthpages" },
            { text: "GTM Collective", link: "/constructs/gtm-collective" },
            { text: "Hardening", link: "/constructs/hardening" },
            { text: "Herald", link: "/constructs/herald" },
            { text: "K-Hole", link: "/constructs/k-hole" },
            { text: "Mibera Codex", link: "/constructs/mibera-codex" },
            { text: "Observer", link: "/constructs/observer" },
            { text: "Protocol", link: "/constructs/protocol" },
            { text: "Showcase", link: "/constructs/showcase" },
            { text: "Social Oracle", link: "/constructs/social-oracle" },
            { text: "The Arcade", link: "/constructs/the-arcade" },
            { text: "The Easel", link: "/constructs/the-easel" },
            { text: "The Mint", link: "/constructs/the-mint" },
            { text: "The Speakers", link: "/constructs/the-speakers" },
            { text: "VFX Playbook", link: "/constructs/vfx-playbook" },
            { text: "Vocabulary Bank", link: "/constructs/vocabulary-bank" },
            { text: "WebGL Particles", link: "/constructs/webgl-particles" },
            { text: "Webreel", link: "/constructs/webreel" },
          ],
        },
      ],
      "/architecture/": [
        {
          text: "Architecture",
          items: [
            { text: "ECS Frame", link: "/architecture/ecs" },
            { text: "Topology", link: "/architecture/topology" },
          ],
        },
      ],
      "/verification/": [
        {
          text: "Verification",
          items: [
            { text: "Echelon", link: "/verification/echelon" },
            {
              text: "Verification Guide",
              link: "/verification/verification-guide",
            },
          ],
        },
      ],
      "/network/": [
        {
          text: "Network",
          items: [
            { text: "Overview", link: "/network/index" },
            { text: "Health", link: "/network/health" },
            { text: "Operator", link: "/network/operator" },
            { text: "Personas", link: "/network/personas" },
            {
              text: "Audit (2026-03-17)",
              link: "/network/audit-2026-03-17",
            },
          ],
        },
      ],
    },

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/0xHoneyJar/loa-constructs",
      },
    ],

    search: {
      provider: "local",
    },
  },
});
