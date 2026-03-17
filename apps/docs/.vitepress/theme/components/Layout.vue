<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import AsideGraph from "./AsideGraph.vue";

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template #aside-outline-before>
      <AsideGraph />
    </template>
  </Layout>
</template>
