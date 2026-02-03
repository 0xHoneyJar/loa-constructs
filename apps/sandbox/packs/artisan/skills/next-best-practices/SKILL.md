---
name: next-best-practices
description: React and Next.js performance optimization patterns from Vercel Engineering
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Edit
---

# Next.js Best Practices

Comprehensive performance optimization guide for React and Next.js applications, based on Vercel Engineering guidelines. Contains 57 rules across 8 categories, prioritized by impact.

## Trigger

```
/next
```

## Overview

Reference these guidelines when:
- Writing new React components or Next.js pages
- Implementing data fetching (client or server-side)
- Reviewing code for performance issues
- Refactoring existing React/Next.js code
- Optimizing bundle size or load times

## Rule Categories by Priority

| Priority | Category | Impact | Rules |
|----------|----------|--------|-------|
| 1 | Eliminating Waterfalls | CRITICAL | 5 |
| 2 | Bundle Size Optimization | CRITICAL | 5 |
| 3 | Server-Side Performance | HIGH | 7 |
| 4 | Client-Side Data Fetching | MEDIUM-HIGH | 4 |
| 5 | Re-render Optimization | MEDIUM | 12 |
| 6 | Rendering Performance | MEDIUM | 9 |
| 7 | JavaScript Performance | LOW-MEDIUM | 12 |
| 8 | Advanced Patterns | LOW | 3 |

## Workflow

### Phase 1: Identify Performance Issues

Start with CRITICAL categories first:

1. **Waterfalls** - Sequential async operations
2. **Bundle Size** - Large JavaScript bundles
3. **Server Performance** - Slow server-side rendering

### Phase 2: Apply Rules by Category

## 1. Eliminating Waterfalls (CRITICAL)

Sequential async operations are the #1 cause of slow pages.

### async-parallel

Use `Promise.all()` for independent operations:

```typescript
// Bad - sequential, slow
const user = await getUser(id);
const posts = await getPosts(id);
const comments = await getComments(id);

// Good - parallel, fast
const [user, posts, comments] = await Promise.all([
  getUser(id),
  getPosts(id),
  getComments(id),
]);
```

### async-defer-await

Move await into branches where actually used:

```typescript
// Bad - always waits even if not needed
async function getData(shouldFetch: boolean) {
  const data = await fetchData();
  if (shouldFetch) {
    return data;
  }
  return null;
}

// Good - only awaits when needed
async function getData(shouldFetch: boolean) {
  if (shouldFetch) {
    return await fetchData();
  }
  return null;
}
```

### async-suspense-boundaries

Use Suspense to stream content:

```tsx
// Good - streams independently
<Suspense fallback={<HeaderSkeleton />}>
  <Header />
</Suspense>
<Suspense fallback={<ContentSkeleton />}>
  <Content />
</Suspense>
```

## 2. Bundle Size Optimization (CRITICAL)

### bundle-barrel-imports

Import directly, avoid barrel files:

```typescript
// Bad - imports entire barrel, tree-shaking fails
import { Button } from "@/components";

// Good - imports only what's needed
import { Button } from "@/components/button";
```

### bundle-dynamic-imports

Use `next/dynamic` for heavy components:

```tsx
// Bad - loaded on initial page load
import HeavyChart from "@/components/heavy-chart";

// Good - loaded only when needed
const HeavyChart = dynamic(() => import("@/components/heavy-chart"), {
  loading: () => <ChartSkeleton />,
});
```

### bundle-defer-third-party

Load analytics/logging after hydration:

```tsx
// Good - defer non-critical scripts
useEffect(() => {
  // Load analytics after hydration
  import("@/lib/analytics").then((mod) => mod.init());
}, []);
```

### bundle-conditional

Load modules only when feature is activated:

```tsx
// Good - load on demand
const handleExport = async () => {
  const { exportToPDF } = await import("@/lib/pdf-export");
  exportToPDF(data);
};
```

## 3. Server-Side Performance (HIGH)

### server-cache-react

Use `React.cache()` for per-request deduplication:

```typescript
// Good - deduplicated within same request
import { cache } from "react";

export const getUser = cache(async (id: string) => {
  return await db.user.findUnique({ where: { id } });
});
```

### server-parallel-fetching

Restructure components to parallelize fetches:

```tsx
// Bad - sequential in parent
async function Page() {
  const user = await getUser();
  const posts = await getPosts(user.id); // Waits for user
  return <Content user={user} posts={posts} />;
}

// Good - parallel with Suspense
async function Page() {
  const user = await getUser();
  return (
    <>
      <UserInfo user={user} />
      <Suspense fallback={<PostsSkeleton />}>
        <Posts userId={user.id} />
      </Suspense>
    </>
  );
}
```

### server-serialization

Minimize data passed to client components:

```tsx
// Bad - passes entire object
<ClientComponent data={fullUserObject} />

// Good - passes only what's needed
<ClientComponent name={user.name} avatar={user.avatar} />
```

## 4. Client-Side Data Fetching (MEDIUM-HIGH)

### client-swr-dedup

Use SWR for automatic request deduplication:

```tsx
// Good - SWR handles deduplication
import useSWR from "swr";

function UserProfile({ userId }) {
  const { data: user } = useSWR(`/api/users/${userId}`, fetcher);
  return <div>{user?.name}</div>;
}
```

### client-passive-event-listeners

Use passive listeners for scroll:

```typescript
// Good - passive for better scroll performance
window.addEventListener("scroll", handleScroll, { passive: true });
```

## 5. Re-render Optimization (MEDIUM)

### rerender-memo

Extract expensive work into memoized components:

```tsx
// Bad - recalculates on every parent render
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <ExpensiveList items={items} /> {/* Re-renders unnecessarily */}
    </div>
  );
}

// Good - memoized, only re-renders when items change
const MemoizedList = memo(ExpensiveList);

function Parent() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <MemoizedList items={items} />
    </div>
  );
}
```

### rerender-lazy-state-init

Pass function to useState for expensive initial values:

```tsx
// Bad - runs on every render
const [data, setData] = useState(expensiveComputation());

// Good - runs only once
const [data, setData] = useState(() => expensiveComputation());
```

### rerender-functional-setstate

Use functional setState for stable callbacks:

```tsx
// Bad - needs count in dependency array
const increment = useCallback(() => {
  setCount(count + 1);
}, [count]);

// Good - stable callback, no dependencies
const increment = useCallback(() => {
  setCount((c) => c + 1);
}, []);
```

### rerender-transitions

Use `startTransition` for non-urgent updates:

```tsx
// Good - keeps UI responsive during heavy updates
import { startTransition } from "react";

function handleSearch(query: string) {
  // Urgent: update input immediately
  setInputValue(query);

  // Non-urgent: can be interrupted
  startTransition(() => {
    setSearchResults(filterResults(query));
  });
}
```

## 6. Rendering Performance (MEDIUM)

### rendering-content-visibility

Use `content-visibility` for long lists:

```css
.list-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 100px;
}
```

### rendering-conditional-render

Use ternary, not `&&` for conditionals:

```tsx
// Bad - can render "0" or "false"
{count && <Counter count={count} />}

// Good - explicit ternary
{count > 0 ? <Counter count={count} /> : null}
```

### rendering-hydration-no-flicker

Use inline script for client-only data:

```tsx
// Good - prevents flash of incorrect content
<script
  dangerouslySetInnerHTML={{
    __html: `
      (function() {
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
      })();
    `,
  }}
/>
```

## 7. JavaScript Performance (LOW-MEDIUM)

### js-set-map-lookups

Use Set/Map for O(1) lookups:

```typescript
// Bad - O(n) lookup
const ids = [1, 2, 3, 4, 5];
items.filter(item => ids.includes(item.id));

// Good - O(1) lookup
const idSet = new Set([1, 2, 3, 4, 5]);
items.filter(item => idSet.has(item.id));
```

### js-early-exit

Return early from functions:

```typescript
// Bad - nested conditions
function process(data) {
  if (data) {
    if (data.valid) {
      // ... lots of code
    }
  }
}

// Good - early returns
function process(data) {
  if (!data) return;
  if (!data.valid) return;
  // ... lots of code
}
```

### js-combine-iterations

Combine multiple filter/map into one loop:

```typescript
// Bad - multiple iterations
const filtered = items.filter(x => x.active);
const mapped = filtered.map(x => x.name);

// Good - single iteration
const result = items.reduce((acc, x) => {
  if (x.active) acc.push(x.name);
  return acc;
}, []);
```

## Quick Reference Card

```
CRITICAL (fix immediately):
├── Promise.all() for parallel operations
├── Import directly, not from barrels
├── next/dynamic for heavy components
├── Defer third-party scripts
└── Suspense for streaming

HIGH (fix soon):
├── React.cache() for request dedup
├── Parallel component fetching
├── Minimize client serialization
└── SWR for client fetching

MEDIUM (optimize):
├── memo() for expensive components
├── Functional setState
├── startTransition for heavy updates
├── content-visibility for lists
└── Ternary for conditional render

LOW (when time permits):
├── Set/Map for lookups
├── Early returns
├── Combine iterations
└── Cache property access
```

## Checklist

```
Data Fetching:
├── [ ] No sequential awaits for independent data
├── [ ] Promise.all() used where applicable
├── [ ] React.cache() for server deduplication
├── [ ] SWR for client-side fetching
└── [ ] Suspense boundaries for streaming

Bundle Size:
├── [ ] Direct imports, no barrels
├── [ ] next/dynamic for heavy components
├── [ ] Third-party scripts deferred
├── [ ] Conditional imports for features
└── [ ] Bundle analyzer checked

Rendering:
├── [ ] memo() on expensive components
├── [ ] Functional setState in callbacks
├── [ ] startTransition for heavy updates
├── [ ] content-visibility on long lists
└── [ ] Ternary for conditional rendering

Server:
├── [ ] Minimal data serialization
├── [ ] Parallel component structure
├── [ ] Server actions authenticated
└── [ ] after() for non-blocking ops
```
