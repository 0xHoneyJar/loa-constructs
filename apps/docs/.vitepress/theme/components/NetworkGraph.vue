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

const container = ref<HTMLDivElement>();
let simulation: d3.Simulation<SimNode, SimEdge> | null = null;
let resizeObserver: ResizeObserver | null = null;

function getConnectionCount(id: string): number {
  return graphEdges.filter((e) => e.source === id || e.target === id).length;
}

function buildGraph(width: number, height: number) {
  if (!container.value) return;

  // Clear previous
  d3.select(container.value).selectAll("*").remove();
  if (simulation) simulation.stop();

  const svg = d3
    .select(container.value)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .style("background", "oklch(0.12 0.005 240)");

  // Glow filter for nodes
  const defs = svg.append("defs");
  const filter = defs
    .append("filter")
    .attr("id", "node-glow")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("width", "200%")
    .attr("height", "200%");
  filter
    .append("feGaussianBlur")
    .attr("stdDeviation", "3")
    .attr("result", "blur");
  const merge = filter.append("feMerge");
  merge.append("feMergeNode").attr("in", "blur");
  merge.append("feMergeNode").attr("in", "SourceGraphic");

  const g = svg.append("g");

  // Zoom
  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.3, 4])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
  svg.call(zoom);

  // Center initial view
  svg.call(
    zoom.transform,
    d3.zoomIdentity.translate(width / 2, height / 2).scale(0.9)
  );

  // Build simulation data
  const simNodes: SimNode[] = graphNodes.map((n) => ({ ...n }));
  const simEdges: SimEdge[] = graphEdges.map((e) => ({
    source: e.source,
    target: e.target,
    type: e.type,
  }));

  // Force simulation
  simulation = d3
    .forceSimulation<SimNode>(simNodes)
    .force(
      "link",
      d3
        .forceLink<SimNode, SimEdge>(simEdges)
        .id((d) => d.id)
        .distance(120)
    )
    .force("charge", d3.forceManyBody().strength(-400))
    .force("center", d3.forceCenter(0, 0))
    .force("collision", d3.forceCollide().radius(30))
    .alphaDecay(0.02);

  // Edges
  const edgeGroup = g
    .append("g")
    .attr("class", "edges")
    .selectAll("line")
    .data(simEdges)
    .join("line")
    .attr("stroke", (d) => edgeColors[d.type])
    .attr("stroke-width", (d) => (d.type === "governs" ? 1.5 : 1))
    .attr("stroke-opacity", 0.25);

  // Node groups
  const nodeGroup = g
    .append("g")
    .attr("class", "nodes")
    .selectAll<SVGGElement, SimNode>("g")
    .data(simNodes)
    .join("g")
    .attr("cursor", "pointer")
    .call(
      d3
        .drag<SVGGElement, SimNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation!.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation!.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

  // Node circles
  nodeGroup
    .append("circle")
    .attr("r", (d) => {
      const count = getConnectionCount(d.id);
      return Math.max(5, Math.min(14, 4 + count * 1.5));
    })
    .attr("fill", (d) => categoryColors[d.category] ?? "oklch(0.50 0.05 240)")
    .attr("stroke", (d) => categoryColors[d.category] ?? "oklch(0.50 0.05 240)")
    .attr("stroke-width", 1.5)
    .attr("stroke-opacity", 0.4)
    .attr("fill-opacity", 0.85)
    .attr("filter", "url(#node-glow)");

  // Labels (hidden by default, shown on hover)
  const labels = nodeGroup
    .append("text")
    .text((d) => d.name)
    .attr("dx", (d) => {
      const count = getConnectionCount(d.id);
      return Math.max(5, Math.min(14, 4 + count * 1.5)) + 6;
    })
    .attr("dy", "0.35em")
    .attr("fill", "oklch(0.85 0.01 240)")
    .attr("font-size", "11px")
    .attr("font-family", "'Space Grotesk', sans-serif")
    .attr("font-weight", "500")
    .attr("opacity", 0)
    .attr("pointer-events", "none");

  // Hover behavior
  nodeGroup
    .on("mouseenter", function (_event, d) {
      const connectedIds = new Set<string>();
      connectedIds.add(d.id);
      simEdges.forEach((e) => {
        const src = typeof e.source === "object" ? (e.source as SimNode).id : e.source;
        const tgt = typeof e.target === "object" ? (e.target as SimNode).id : e.target;
        if (src === d.id) connectedIds.add(tgt);
        if (tgt === d.id) connectedIds.add(src);
      });

      // Dim unconnected nodes
      nodeGroup
        .select("circle")
        .transition()
        .duration(150)
        .attr("fill-opacity", (n: any) => (connectedIds.has(n.id) ? 0.95 : 0.12))
        .attr("stroke-opacity", (n: any) => (connectedIds.has(n.id) ? 0.7 : 0.08));

      // Show labels for connected nodes
      labels
        .transition()
        .duration(150)
        .attr("opacity", (n: any) => (connectedIds.has(n.id) ? 1 : 0));

      // Highlight connected edges
      edgeGroup
        .transition()
        .duration(150)
        .attr("stroke-opacity", (e: any) => {
          const src = typeof e.source === "object" ? e.source.id : e.source;
          const tgt = typeof e.target === "object" ? e.target.id : e.target;
          return src === d.id || tgt === d.id ? 0.8 : 0.04;
        })
        .attr("stroke-width", (e: any) => {
          const src = typeof e.source === "object" ? e.source.id : e.source;
          const tgt = typeof e.target === "object" ? e.target.id : e.target;
          return src === d.id || tgt === d.id ? 2 : 0.5;
        });
    })
    .on("mouseleave", function () {
      nodeGroup
        .select("circle")
        .transition()
        .duration(300)
        .attr("fill-opacity", 0.85)
        .attr("stroke-opacity", 0.4);

      labels.transition().duration(300).attr("opacity", 0);

      edgeGroup
        .transition()
        .duration(300)
        .attr("stroke-opacity", 0.25)
        .attr("stroke-width", (d: any) => (d.type === "governs" ? 1.5 : 1));
    });

  // Click navigates to construct page
  nodeGroup.on("click", (_event, d) => {
    window.location.href = `/constructs/${d.id}`;
  });

  // Simulation tick
  simulation.on("tick", () => {
    edgeGroup
      .attr("x1", (d: any) => d.source.x)
      .attr("y1", (d: any) => d.source.y)
      .attr("x2", (d: any) => d.target.x)
      .attr("y2", (d: any) => d.target.y);

    nodeGroup.attr("transform", (d) => `translate(${d.x},${d.y})`);
  });
}

onMounted(() => {
  if (!container.value) return;

  const rect = container.value.getBoundingClientRect();
  buildGraph(rect.width, rect.height);

  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        buildGraph(width, height);
      }
    }
  });
  resizeObserver.observe(container.value);
});

onUnmounted(() => {
  if (simulation) simulation.stop();
  if (resizeObserver) resizeObserver.disconnect();
});
</script>

<template>
  <div
    ref="container"
    class="network-graph"
  />
</template>

<style scoped>
.network-graph {
  width: 100%;
  height: 100%;
  min-height: 500px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.network-graph :deep(svg) {
  display: block;
}
</style>
