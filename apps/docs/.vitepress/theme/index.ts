import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import "./custom.css";

// Graph components registered globally for use in markdown
import NetworkGraph from "./components/NetworkGraph.vue";
import LocalGraph from "./components/LocalGraph.vue";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("NetworkGraph", NetworkGraph);
    app.component("LocalGraph", LocalGraph);
  },
} satisfies Theme;
