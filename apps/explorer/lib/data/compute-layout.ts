import type { ConstructNode, ConstructEdge, Domain } from '@/lib/types/graph';

interface Vector2 {
  x: number;
  y: number;
}

interface LayoutConfig {
  width: number;
  height: number;
  iterations: number;
  repulsionStrength: number;
  attractionStrength: number;
  domainGravity: number;
}

// Domain cluster centers - arranged in a hexagonal pattern (spread out more)
const DOMAIN_CENTERS: Record<Domain, Vector2> = {
  gtm: { x: -320, y: 140 },
  dev: { x: 320, y: 140 },
  security: { x: 0, y: -280 },
  ops: { x: 320, y: -140 },
  docs: { x: -320, y: -140 },
  analytics: { x: 0, y: 280 },
};

const DEFAULT_CONFIG: LayoutConfig = {
  width: 1000,
  height: 700,
  iterations: 50,
  repulsionStrength: 12000,
  attractionStrength: 0.05,
  domainGravity: 0.03,
};

function distance(a: Vector2, b: Vector2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalize(v: Vector2): Vector2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function computeLayout(
  nodes: ConstructNode[],
  edges: ConstructEdge[],
  config: LayoutConfig = DEFAULT_CONFIG
): Map<string, Vector2> {
  const positions = new Map<string, Vector2>();
  const velocities = new Map<string, Vector2>();

  // Initialize positions near domain centers with some randomness
  for (const node of nodes) {
    const center = DOMAIN_CENTERS[node.domain] || { x: 0, y: 0 };
    // Use node id hash for deterministic "randomness"
    const hash = node.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const angle = (hash % 360) * (Math.PI / 180);
    const radius = 60 + (hash % 80);

    positions.set(node.id, {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
    velocities.set(node.id, { x: 0, y: 0 });
  }

  // Build edge lookup for faster access
  const edgeMap = new Map<string, string[]>();
  for (const edge of edges) {
    if (!edgeMap.has(edge.source)) edgeMap.set(edge.source, []);
    if (!edgeMap.has(edge.target)) edgeMap.set(edge.target, []);
    edgeMap.get(edge.source)!.push(edge.target);
    edgeMap.get(edge.target)!.push(edge.source);
  }

  // Run simulation
  for (let iter = 0; iter < config.iterations; iter++) {
    const cooling = 1 - iter / config.iterations;

    for (const node of nodes) {
      const pos = positions.get(node.id)!;
      let fx = 0;
      let fy = 0;

      // Repulsion from all other nodes
      for (const other of nodes) {
        if (other.id === node.id) continue;
        const otherPos = positions.get(other.id)!;
        const dist = Math.max(distance(pos, otherPos), 1);
        const repulsion = config.repulsionStrength / (dist * dist);
        const dir = normalize({ x: pos.x - otherPos.x, y: pos.y - otherPos.y });
        fx += dir.x * repulsion;
        fy += dir.y * repulsion;
      }

      // Attraction to connected nodes
      const connected = edgeMap.get(node.id) || [];
      for (const connectedId of connected) {
        const connectedPos = positions.get(connectedId);
        if (!connectedPos) continue;
        const dist = distance(pos, connectedPos);
        const attraction = dist * config.attractionStrength;
        const dir = normalize({
          x: connectedPos.x - pos.x,
          y: connectedPos.y - pos.y,
        });
        fx += dir.x * attraction;
        fy += dir.y * attraction;
      }

      // Domain gravity - pull toward cluster center
      const center = DOMAIN_CENTERS[node.domain] || { x: 0, y: 0 };
      const toCenterX = center.x - pos.x;
      const toCenterY = center.y - pos.y;
      fx += toCenterX * config.domainGravity;
      fy += toCenterY * config.domainGravity;

      // Packs get extra central gravity
      if (node.type === 'pack') {
        fx += -pos.x * 0.01;
        fy += -pos.y * 0.01;
      }

      // Update velocity with damping
      const vel = velocities.get(node.id)!;
      vel.x = (vel.x + fx) * 0.5 * cooling;
      vel.y = (vel.y + fy) * 0.5 * cooling;

      // Update position
      pos.x += vel.x;
      pos.y += vel.y;

      // Clamp to bounds
      const margin = 50;
      pos.x = Math.max(-config.width / 2 + margin, Math.min(config.width / 2 - margin, pos.x));
      pos.y = Math.max(-config.height / 2 + margin, Math.min(config.height / 2 - margin, pos.y));
    }
  }

  return positions;
}

// Scale positions for Three.js coordinate system
export function scalePositions(
  positions: Map<string, Vector2>,
  scale: number = 0.012
): Map<string, Vector2> {
  const scaled = new Map<string, Vector2>();
  for (const [id, pos] of positions) {
    scaled.set(id, {
      x: pos.x * scale,
      y: pos.y * scale,
    });
  }
  return scaled;
}
