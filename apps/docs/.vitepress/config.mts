import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Constructs",
  description: "Documentation for the construct ecosystem",
  appearance: "dark",

  vite: {
    ssr: {
      noExternal: ["d3", "d3-array", "d3-axis", "d3-brush", "d3-chord", "d3-color", "d3-contour", "d3-delaunay", "d3-dispatch", "d3-drag", "d3-dsv", "d3-ease", "d3-fetch", "d3-force", "d3-format", "d3-geo", "d3-hierarchy", "d3-interpolate", "d3-path", "d3-polygon", "d3-quadtree", "d3-random", "d3-scale", "d3-scale-chromatic", "d3-selection", "d3-shape", "d3-time", "d3-time-format", "d3-timer", "d3-transition", "d3-zoom", "delaunator", "internmap", "robust-predicates"],
    },
  },

  head: [],

  themeConfig: {
    nav: [
      { text: "Network", link: "/" },
      { text: "Constructs", link: "/constructs/" },
      { text: "Architecture", link: "/architecture/ecs" },
      { text: "Verification", link: "/verification/echelon" },
    ],

    sidebar: {
      "/constructs/": [
        {
          text: "Overview",
          link: "/constructs/",
        },
        {
          text: "Design",
          collapsed: false,
          items: [
            { text: "Artisan", link: "/constructs/artisan" },
            { text: "The Easel", link: "/constructs/the-easel" },
            { text: "Showcase", link: "/constructs/showcase" },
            { text: "The Arcade", link: "/constructs/the-arcade" },
            { text: "The Mint", link: "/constructs/the-mint" },
            { text: "The Speakers", link: "/constructs/the-speakers" },
            { text: "WebGL Particles", link: "/constructs/webgl-particles" },
            { text: "WebReel", link: "/constructs/webreel" },
            { text: "VFX Playbook", link: "/constructs/vfx-playbook" },
          ],
        },
        {
          text: "Analytics",
          collapsed: false,
          items: [
            { text: "Beehive", link: "/constructs/observer" },
            { text: "K-Hole", link: "/constructs/k-hole" },
            { text: "Gecko", link: "/constructs/gecko" },
          ],
        },
        {
          text: "Security",
          collapsed: false,
          items: [
            { text: "Crucible", link: "/constructs/crucible" },
            { text: "Hardening", link: "/constructs/hardening" },
            { text: "Dynamic Auth", link: "/constructs/dynamic-auth" },
          ],
        },
        {
          text: "Marketing",
          collapsed: false,
          items: [
            { text: "GTM Collective", link: "/constructs/gtm-collective" },
            { text: "Social Oracle", link: "/constructs/social-oracle" },
            { text: "GrowthPages", link: "/constructs/growthpages" },
          ],
        },
        {
          text: "Operations",
          collapsed: false,
          items: [
            { text: "Beacon", link: "/constructs/beacon" },
            { text: "Herald", link: "/constructs/herald" },
          ],
        },
        {
          text: "Documentation",
          collapsed: false,
          items: [
            { text: "Mibera Codex", link: "/constructs/mibera-codex" },
            {
              text: "Vocabulary Bank",
              link: "/constructs/vocabulary-bank",
            },
          ],
        },
        {
          text: "Development",
          collapsed: false,
          items: [{ text: "Protocol", link: "/constructs/protocol" }],
        },
      ],
      "/architecture/": [
        {
          text: "Network",
          items: [
            { text: "Overview", link: "/" },
            { text: "Health", link: "/network/health" },
            { text: "Operator Modes", link: "/network/operator" },
            { text: "Personas", link: "/network/personas" },
          ],
        },
        {
          text: "Architecture",
          items: [
            { text: "ECS Frame", link: "/architecture/ecs" },
            { text: "Topology", link: "/architecture/topology" },
          ],
        },
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
      "/verification/": [
        {
          text: "Network",
          items: [
            { text: "Overview", link: "/" },
            { text: "Health", link: "/network/health" },
            { text: "Operator Modes", link: "/network/operator" },
            { text: "Personas", link: "/network/personas" },
          ],
        },
        {
          text: "Architecture",
          items: [
            { text: "ECS Frame", link: "/architecture/ecs" },
            { text: "Topology", link: "/architecture/topology" },
          ],
        },
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
            { text: "Overview", link: "/" },
            { text: "Health", link: "/network/health" },
            { text: "Operator Modes", link: "/network/operator" },
            { text: "Personas", link: "/network/personas" },
            {
              text: "Audit (2026-03-17)",
              link: "/network/audit-2026-03-17",
            },
          ],
        },
        {
          text: "Architecture",
          items: [
            { text: "ECS Frame", link: "/architecture/ecs" },
            { text: "Topology", link: "/architecture/topology" },
          ],
        },
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
      "/": [
        {
          text: "Network",
          items: [
            { text: "Overview", link: "/" },
            { text: "Health", link: "/network/health" },
            { text: "Operator Modes", link: "/network/operator" },
            { text: "Personas", link: "/network/personas" },
            {
              text: "Audit (2026-03-17)",
              link: "/network/audit-2026-03-17",
            },
          ],
        },
        {
          text: "Architecture",
          items: [
            { text: "ECS Frame", link: "/architecture/ecs" },
            { text: "Topology", link: "/architecture/topology" },
          ],
        },
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
