---
outline: [2, 3]
---

<script setup>
import { useRoute } from 'vitepress'
import ConstructPage from '../.vitepress/theme/components/ConstructPage.vue'

const { params } = useRoute().data
const slug = params?.slug || ''
</script>

<ConstructPage :slug="slug" />
