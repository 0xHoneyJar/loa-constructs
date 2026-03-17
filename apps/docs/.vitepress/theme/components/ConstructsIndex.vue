<script setup lang="ts">
import data from '../../data/constructs.json'

const CATEGORY_ORDER = ['design', 'analytics', 'security', 'marketing', 'operations', 'documentation', 'development']
const CATEGORY_LABELS: Record<string, string> = {
  design: 'Design', analytics: 'Analytics', security: 'Security',
  marketing: 'Marketing', operations: 'Operations',
  documentation: 'Documentation', development: 'Development',
}

const grouped = CATEGORY_ORDER
  .map(cat => ({
    label: CATEGORY_LABELS[cat] || cat,
    constructs: data.constructs.filter((c: any) => c.category === cat),
  }))
  .filter(g => g.constructs.length > 0)

const total = data.constructs.length
const totalSkills = data.constructs.reduce((s: number, c: any) => s + (c.skills_count || 0), 0)
</script>

<template>
  <div class="vp-doc">
    <h1>Constructs</h1>
    <blockquote>
      <p>{{ total }} constructs. {{ totalSkills }} skills. Lateral composition.</p>
    </blockquote>

    <div class="language-bash vp-adaptive-theme">
      <pre><code><span class="line"><span>loa install &lt;slug&gt;</span></span></code></pre>
    </div>

    <div v-for="group in grouped" :key="group.label">
      <h2>{{ group.label }}</h2>
      <table>
        <thead>
          <tr>
            <th>Construct</th>
            <th>Skills</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in group.constructs" :key="c.slug">
            <td><a :href="'/constructs/' + c.slug">{{ c.name }}</a></td>
            <td>{{ c.skills_count }}</td>
            <td>{{ c.short_description || (c.description ? c.description.slice(0, 80) + '...' : '—') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
