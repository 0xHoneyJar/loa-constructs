import { defineConfig } from "vitepress";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Read prebuild data for dynamic sidebar generation
const DATA_FILE = resolve(__dirname, "data/constructs.json");

const CATEGORY_ORDER = [
  "design", "analytics", "security", "marketing",
  "operations", "documentation", "development",
];
const CATEGORY_LABELS: Record<string, string> = {
  design: "Design", analytics: "Analytics", security: "Security",
  marketing: "Marketing", operations: "Operations",
  documentation: "Documentation", development: "Development",
};

function buildConstructSidebar() {
  if (!existsSync(DATA_FILE)) {
    return [{ text: "Overview", link: "/constructs/" }];
  }

  const raw = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  const byCategory: Record<string, Array<{ slug: string; name: string }>> = {};

  for (const c of raw.constructs) {
    const cat = c.category || "development";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(c);
  }

  return [
    { text: "Overview", link: "/constructs/" },
    ...CATEGORY_ORDER
      .filter((cat) => byCategory[cat]?.length)
      .map((cat) => ({
        text: CATEGORY_LABELS[cat] || cat,
        collapsed: false,
        items: byCategory[cat].map((c) => ({
          text: c.name,
          link: `/constructs/${c.slug}`,
        })),
      })),
  ];
}

const sharedSidebar = [
  {
    text: "Network",
    items: [
      { text: "Overview", link: "/" },
      { text: "Health", link: "/network/health" },
      { text: "Operator Modes", link: "/network/operator" },
      { text: "Personas", link: "/network/personas" },
      { text: "Audit (2026-03-17)", link: "/network/audit-2026-03-17" },
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
      { text: "Verification Guide", link: "/verification/verification-guide" },
    ],
  },
];

export default defineConfig({
  title: "Constructs",
  description: "Documentation for the construct ecosystem",
  appearance: "dark",

  vite: {
    ssr: {
      noExternal: [
        "d3", "d3-array", "d3-axis", "d3-brush", "d3-chord", "d3-color",
        "d3-contour", "d3-delaunay", "d3-dispatch", "d3-drag", "d3-dsv",
        "d3-ease", "d3-fetch", "d3-force", "d3-format", "d3-geo",
        "d3-hierarchy", "d3-interpolate", "d3-path", "d3-polygon",
        "d3-quadtree", "d3-random", "d3-scale", "d3-scale-chromatic",
        "d3-selection", "d3-shape", "d3-time", "d3-time-format", "d3-timer",
        "d3-transition", "d3-zoom", "delaunator", "internmap",
        "robust-predicates",
      ],
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
      "/constructs/": buildConstructSidebar(),
      "/architecture/": sharedSidebar,
      "/verification/": sharedSidebar,
      "/network/": sharedSidebar,
      "/": sharedSidebar,
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/0xHoneyJar/loa-constructs" },
    ],

    search: { provider: "local" },
  },
});
