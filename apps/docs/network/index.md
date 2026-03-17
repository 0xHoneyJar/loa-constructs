---
layout: doc
---

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vitepress'

onMounted(() => {
  const router = useRouter()
  router.go('/')
})
</script>

Redirecting to [Network Overview](/)...
