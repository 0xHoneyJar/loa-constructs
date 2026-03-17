---
outline: [2, 3]
---

<script setup>
import { useData } from 'vitepress'
import ConstructPage from '../.vitepress/theme/components/ConstructPage.vue'

const { params } = useData()
const slug = params.value?.slug || ''
</script>

<ConstructPage :slug="slug" />
