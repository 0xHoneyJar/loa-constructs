import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import "./custom.css";

import Layout from "./components/Layout.vue";
import NetworkGraph from "./components/NetworkGraph.vue";
import LocalGraph from "./components/LocalGraph.vue";

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component("NetworkGraph", NetworkGraph);
    app.component("LocalGraph", LocalGraph);
  },
} satisfies Theme;
