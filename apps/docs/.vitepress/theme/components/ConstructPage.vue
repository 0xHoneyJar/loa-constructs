<script setup lang="ts">
import { computed } from 'vue'
import data from '../../data/constructs.json'

const props = defineProps<{ slug: string }>()

const construct = computed(() =>
  data.constructs.find((c: any) => c.slug === props.slug) || null
)

const c = construct
</script>

<template>
  <div v-if="c" class="vp-doc">
    <h1>
      {{ c.name }}
      <Badge v-if="c.verification_tier === 'PROVEN'" type="tip" text="Proven" />
      <Badge v-if="c.verification_tier === 'BACKTESTED'" type="info" text="Backtested" />
    </h1>

    <p v-if="c.short_description" class="construct-short-desc">
      {{ c.short_description }}
    </p>

    <blockquote v-if="c.description">
      <p>{{ c.description }}</p>
    </blockquote>

    <p class="construct-meta">
      <strong>Version</strong>: {{ c.version }}
      · <strong>Category</strong>: {{ c.category }}
      <template v-if="c.construct_type">
        · <strong>Type</strong>: {{ c.construct_type }}
      </template>
      · <strong>Skills</strong>: {{ c.skills_count }}
      <template v-if="c.commands.length">
        · <strong>Commands</strong>: {{ c.commands.length }}
      </template>
    </p>

    <h2>Install</h2>
    <div class="language-bash vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">bash</span><pre class="shiki shiki-themes" tabindex="0"><code><span class="line"><span>loa install {{ c.slug }}</span></span></code></pre></div>

    <template v-if="c.skills.length">
      <h2>Skills</h2>
      <table>
        <thead><tr><th>Skill</th><th>Description</th></tr></thead>
        <tbody>
          <tr v-for="s in c.skills" :key="s.slug">
            <td><code>/{{ s.slug }}</code></td>
            <td>{{ s.description || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <template v-if="c.commands.length">
      <h2>Commands</h2>
      <table>
        <thead><tr><th>Command</th><th>Description</th></tr></thead>
        <tbody>
          <tr v-for="cmd in c.commands" :key="cmd.name">
            <td><code>{{ cmd.name }}</code></td>
            <td>{{ cmd.description || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </template>

    <template v-if="c.governs.length || c.governed_by.length || c.composes_with.length || c.depends_on.length">
      <h2>Relationships</h2>

      <template v-if="c.governed_by.length">
        <h3>Governed By</h3>
        <ul><li v-for="s in c.governed_by" :key="s"><a :href="'/constructs/' + s">{{ s }}</a></li></ul>
      </template>

      <template v-if="c.governs.length">
        <h3>Governs</h3>
        <ul><li v-for="s in c.governs" :key="s"><a :href="'/constructs/' + s">{{ s }}</a></li></ul>
      </template>

      <template v-if="c.depends_on.length">
        <h3>Depends On</h3>
        <ul><li v-for="s in c.depends_on" :key="s"><a :href="'/constructs/' + s">{{ s }}</a></li></ul>
      </template>

      <template v-if="c.composes_with.length">
        <h3>Composes With</h3>
        <ul><li v-for="s in c.composes_with" :key="s"><a :href="'/constructs/' + s">{{ s }}</a></li></ul>
      </template>
    </template>

    <template v-if="c.composition_paths">
      <h2>Composition Paths</h2>
      <template v-if="c.composition_paths.reads?.length">
        <p><strong>Reads from:</strong></p>
        <ul><li v-for="p in c.composition_paths.reads" :key="p"><code>{{ p }}</code></li></ul>
      </template>
      <template v-if="c.composition_paths.writes?.length">
        <p><strong>Writes to:</strong></p>
        <ul><li v-for="p in c.composition_paths.writes" :key="p"><code>{{ p }}</code></li></ul>
      </template>
    </template>

    <h2>Source</h2>
    <ul>
      <li v-if="c.repository_url">
        Repo: <a :href="c.repository_url" target="_blank" rel="noopener noreferrer">{{ c.repository_url.replace('https://github.com/', '') }}</a>
      </li>
      <li v-else>Repo: <code>0xHoneyJar/construct-{{ c.slug }}</code></li>
      <li>Grimoire: <code>grimoires/{{ c.slug }}/</code></li>
    </ul>

    <hr />
    <p>
      <a href="/constructs/">All Constructs</a> ·
      <a href="/architecture/topology">Topology</a> ·
      <a href="/network/health">Health</a>
    </p>
  </div>
</template>

<style scoped>
.construct-short-desc {
  font-size: 1.25rem;
  font-weight: 600;
  color: oklch(0.78 0.01 95);
  margin: 0.5rem 0 1rem;
}
.construct-meta {
  color: oklch(0.68 0.008 95);
  font-size: 0.875rem;
}
</style>
