<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vitepress";
import LocalGraph from "./LocalGraph.vue";

const route = useRoute();

const slug = computed(() => {
  // Extract slug from path like /constructs/artisan.html → artisan
  const match = route.path.match(/\/constructs\/([^/.]+)/);
  return match ? match[1] : null;
});
</script>

<template>
  <div v-if="slug" class="aside-graph">
    <div class="aside-graph-header">INTERACTIVE GRAPH</div>
    <ClientOnly>
      <LocalGraph :slug="slug" />
    </ClientOnly>
  </div>
</template>

<style scoped>
.aside-graph {
  margin-bottom: 1.5rem;
  border: 1px solid oklch(0.22 0.012 250);
}

.aside-graph-header {
  font-family: "Basement Grotesque", "Arial Black", sans-serif;
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: oklch(0.48 0.006 95);
  padding: 0.75rem 0.75rem 0;
}
</style>
