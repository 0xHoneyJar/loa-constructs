<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import * as d3 from "d3";
import {
  nodes as graphNodes,
  edges as graphEdges,
  categoryColors,
  edgeColors,
  type GraphNode,
  type GraphEdge,
} from "./graph-data";

interface SimNode extends GraphNode, d3.SimulationNodeDatum {}
interface SimEdge extends d3.SimulationLinkDatum<SimNode> {
  type: GraphEdge["type"];
}

const props = defineProps<{
  slug: string;
}>();

const container = ref<HTMLDivElement>();
let simulation: d3.Simulation<SimNode, SimEdge> | null = null;

function buildLocalGraph() {
  if (!container.value) return;

  d3.select(container.value).selectAll("*").remove();
  if (simulation) simulation.stop();

  const rect = container.value.getBoundingClientRect();
  const width = rect.width || 280;
  const height = rect.height || 200;

  // Find neighbors of the focal node
  const neighborIds = new Set<string>();
  neighborIds.add(props.slug);
  const localEdges: GraphEdge[] = [];

  graphEdges.forEach((e) => {
    if (e.source === props.slug) {
      neighborIds.add(e.target);
      localEdges.push(e);
    } else if (e.target === props.slug) {
      neighborIds.add(e.source);
      localEdges.push(e);
    }
  });

  if (!neighborIds.has(props.slug)) return;

  const localNodes = graphNodes.filter((n) => neighborIds.has(n.id));
  const simNodes: SimNode[] = localNodes.map((n) => ({ ...n }));
  const simEdges: SimEdge[] = localEdges.map((e) => ({
    source: e.source,
    target: e.target,
    type: e.type,
  }));

  const svg = d3
    .select(container.value)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background", "oklch(0.12 0.008 250)");

  // Glow filter
  const defs = svg.append("defs");
  const filter = defs
    .append("filter")
    .attr("id", "local-glow")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("width", "200%")
    .attr("height", "200%");
  filter.append("feGaussianBlur").attr("stdDeviation", "2").attr("result", "blur");
  const merge = filter.append("feMerge");
  merge.append("feMergeNode").attr("in", "blur");
  merge.append("feMergeNode").attr("in", "SourceGraphic");

  const g = svg.append("g");

  simulation = d3
    .forceSimulation<SimNode>(simNodes)
    .force(
      "link",
      d3
        .forceLink<SimNode, SimEdge>(simEdges)
        .id((d) => d.id)
        .distance(60)
    )
    .force("charge", d3.forceManyBody().strength(-200))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(20))
    .alphaDecay(0.04);

  // Edges
  const edgeGroup = g
    .append("g")
    .selectAll("line")
    .data(simEdges)
    .join("line")
    .attr("stroke", (d) => edgeColors[d.type])
    .attr("stroke-width", 1)
    .attr("stroke-opacity", 0.35);

  // Node groups
  const nodeGroup = g
    .append("g")
    .selectAll<SVGGElement, SimNode>("g")
    .data(simNodes)
    .join("g")
    .attr("cursor", "pointer");

  // Circles
  nodeGroup
    .append("circle")
    .attr("r", (d) => (d.id === props.slug ? 8 : 5))
    .attr("fill", (d) => categoryColors[d.category] ?? "oklch(0.50 0.05 250)")
    .attr("stroke", (d) => categoryColors[d.category] ?? "oklch(0.50 0.05 250)")
    .attr("stroke-width", 1)
    .attr("stroke-opacity", (d) => (d.id === props.slug ? 0.6 : 0.3))
    .attr("fill-opacity", (d) => (d.id === props.slug ? 1 : 0.7))
    .attr("filter", "url(#local-glow)");

  // Labels always visible in local graph
  nodeGroup
    .append("text")
    .text((d) => d.name)
    .attr("dx", (d) => (d.id === props.slug ? 12 : 9))
    .attr("dy", "0.35em")
    .attr("fill", (d) =>
      d.id === props.slug ? "oklch(0.92 0.01 95)" : "oklch(0.65 0.01 95)"
    )
    .attr("font-size", (d) => (d.id === props.slug ? "11px" : "10px"))
    .attr("font-family", "'Geist Mono', monospace")
    .attr("font-weight", (d) => (d.id === props.slug ? "600" : "400"))
    .attr("pointer-events", "none");

  // Click navigation
  nodeGroup.on("click", (_event, d) => {
    if (d.id !== props.slug) {
      window.location.href = `/constructs/${d.id}`;
    }
  });

  simulation.on("tick", () => {
    edgeGroup
      .attr("x1", (d: any) => d.source.x)
      .attr("y1", (d: any) => d.source.y)
      .attr("x2", (d: any) => d.target.x)
      .attr("y2", (d: any) => d.target.y);

    nodeGroup.attr("transform", (d) => `translate(${d.x},${d.y})`);
  });
}

watch(() => props.slug, buildLocalGraph);

onMounted(buildLocalGraph);

onUnmounted(() => {
  if (simulation) simulation.stop();
});
</script>

<template>
  <div
    ref="container"
    class="local-graph"
  />
</template>

<style scoped>
.local-graph {
  width: 100%;
  height: 200px;
  border-radius: 0;
  overflow: hidden;
}

.local-graph :deep(svg) {
  display: block;
}
</style>
