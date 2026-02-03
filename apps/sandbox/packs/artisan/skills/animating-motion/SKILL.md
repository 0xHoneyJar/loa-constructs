---
name: animating-motion
description: Motion design and animation patterns for UI based on Emil Kowalski's principles
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Edit
---

# Animating Motion

Expert motion design and animation patterns for UI, based on Emil Kowalski's "Animations on the Web" principles.

## Trigger

```
/animate
```

## Overview

This skill provides guidance on implementing performant, accessible, and delightful animations in web interfaces. Use it when:

- Adding enter/exit transitions to UI elements
- Implementing drag gestures with momentum
- Optimizing animation performance
- Ensuring accessibility for motion-sensitive users

## Quick Decision Tree

```
Is this element entering or exiting?
└── YES → Use ease-out

Is an on-screen element moving?
└── YES → Use ease-in-out

Is this a hover/color transition?
└── YES → Use ease

Will users see this 100+ times daily?
└── YES → Don't animate it (or drastically reduce)
```

## Workflow

### Phase 1: Identify Animation Type

Determine what kind of animation you need:

| Scenario | Easing | Why |
|----------|--------|-----|
| Dropdowns, modals, tooltips | `ease-out` | User-initiated, needs instant response |
| Element moving on screen | `ease-in-out` | Mimics natural acceleration/deceleration |
| Hover states, color changes | `ease` | Gentle, elegant transitions |
| Drag with momentum | Spring | Physics-based, interruptible |

### Phase 2: Apply Easing Curves

#### ease-out (Most Common)

Use for user-initiated interactions. Creates instant, responsive feeling.

```css
/* Sorted weak to strong */
--ease-out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94);
--ease-out-cubic: cubic-bezier(0.215, 0.61, 0.355, 1);
--ease-out-quart: cubic-bezier(0.165, 0.84, 0.44, 1);
--ease-out-quint: cubic-bezier(0.23, 1, 0.32, 1);
--ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);
--ease-out-circ: cubic-bezier(0.075, 0.82, 0.165, 1);
```

#### ease-in-out (For Movement)

Use when elements already on screen need to move or morph.

```css
/* Sorted weak to strong */
--ease-in-out-quad: cubic-bezier(0.455, 0.03, 0.515, 0.955);
--ease-in-out-cubic: cubic-bezier(0.645, 0.045, 0.355, 1);
--ease-in-out-quart: cubic-bezier(0.77, 0, 0.175, 1);
--ease-in-out-quint: cubic-bezier(0.86, 0, 0.07, 1);
--ease-in-out-expo: cubic-bezier(1, 0, 0, 1);
--ease-in-out-circ: cubic-bezier(0.785, 0.135, 0.15, 0.86);
```

#### ease (For Hover Effects)

Use for hover states and color transitions.

```css
transition: background-color 150ms ease;
```

#### linear (Avoid in UI)

Only use for constant-speed animations (marquees, progress indicators).

#### ease-in (Almost Never)

Avoid - makes interfaces feel sluggish due to slow start.

### Phase 3: Set Duration

| Element Type | Duration |
|--------------|----------|
| Micro-interactions | 100-150ms |
| Standard UI (tooltips, dropdowns) | 150-250ms |
| Modals, drawers | 200-300ms |
| Page transitions | 300-400ms |

**Duration Rules:**
- UI animations should stay under 300ms
- Larger elements animate slower than smaller ones
- Exit animations can be faster than entrances
- Longer travel distance = longer duration

### Phase 4: Ensure Performance

**The Golden Rule:** Only animate `transform` and `opacity`.

These skip layout and paint stages, running entirely on the GPU.

**Avoid animating:**
- `padding`, `margin`, `height`, `width` (trigger layout)
- `blur` filters above 20px (expensive, especially Safari)
- CSS variables in deep component trees

**Optimization:**

```css
/* Force GPU acceleration */
.animated-element {
  will-change: transform;
}
```

**React-specific:**
- Animate outside React's render cycle when possible
- Use refs to update styles directly instead of state
- Re-renders on every frame = dropped frames

**Framer Motion hardware acceleration:**

```jsx
// Hardware accelerated (transform as string)
<motion.div animate={{ transform: "translateX(100px)" }} />

// NOT hardware accelerated (more readable but slower)
<motion.div animate={{ x: 100 }} />
```

### Phase 5: Add Accessibility

**Every animated element needs a `prefers-reduced-motion` media query:**

```css
.modal {
  animation: fadeIn 200ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .modal {
    animation: none;
  }
}
```

**Reduced Motion Guidelines:**
- Set `animation: none` or `transition: none` (no `!important`)
- No exceptions for opacity or color—disable all animations
- Show play buttons instead of autoplay videos

**Framer Motion Implementation:**

```jsx
import { useReducedMotion } from "framer-motion";

function Component() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    />
  );
}
```

## Spring Animations

Springs feel more natural because they simulate real physics with no fixed duration.

### When to Use Springs

- Drag interactions with momentum
- Elements that should feel "alive" (Dynamic Island)
- Gestures that can be interrupted mid-animation
- Organic, playful interfaces

### Configuration

**Apple's approach (recommended):**

```js
// Duration + bounce (easier to understand)
{ type: "spring", duration: 0.5, bounce: 0.2 }
```

**Traditional physics:**

```js
// Mass, stiffness, damping (more complex)
{ type: "spring", mass: 1, stiffness: 100, damping: 10 }
```

### Bounce Guidelines

- **Avoid bounce** in most UI contexts
- **Use bounce** for drag-to-dismiss, playful interactions
- Keep bounce subtle (0.1-0.3) when used

### Interruptibility

Springs maintain velocity when interrupted—CSS animations restart from zero. This makes springs ideal for gestures users might change mid-motion.

## Paired Elements Rule

Elements that animate together must use the same easing and duration.

```css
/* Modal + overlay move as a unit */
.modal { transition: transform 200ms ease-out; }
.overlay { transition: opacity 200ms ease-out; }
```

## The Frequency Principle

| Usage Frequency | Animation Approach |
|-----------------|-------------------|
| 100+ times/day | No animation (or drastically reduced) |
| Occasional use | Standard animation |
| Rare/first-time | Can be special |

**Example:** Raycast never animates its menu toggle because users open it hundreds of times daily.

## Practical Solutions

| Scenario | Solution |
|----------|----------|
| Make buttons feel responsive | Add `transform: scale(0.97)` on `:active` |
| Element appears from nowhere | Start from `scale(0.95)`, not `scale(0)` |
| Shaky/jittery animations | Add `will-change: transform` |
| Hover causes flicker | Animate child element, not parent |
| Popover scales from wrong point | Set `transform-origin` to trigger location |
| Sequential tooltips feel slow | Skip delay/animation after first tooltip |
| Small buttons hard to tap | Use 44px minimum hit area (pseudo-element) |
| Something still feels off | Add subtle blur (under 20px) to mask it |
| Hover triggers on mobile | Use `@media (hover: hover) and (pointer: fine)` |

## Theme Transitions

**Important:** Switching themes should not trigger transitions. Disable transitions during theme changes to prevent flash of animated content.

## AnimatePresence

Use `popLayout` mode on AnimatePresence when an element has an exit animation and is in a group of elements.

```jsx
<AnimatePresence mode="popLayout">
  {items.map(item => (
    <motion.div
      key={item.id}
      exit={{ opacity: 0, scale: 0.9 }}
    />
  ))}
</AnimatePresence>
```

## Drag Gestures

When implementing drag-to-dismiss:
- Ensure velocity-based swiping works
- Velocity (`swipeAmount / timeTaken`) > 0.10 should trigger action
- Use springs for natural momentum feel

## Looping Animations

Pause looping animations when off-screen to save resources:

```jsx
const ref = useRef(null);
const isInView = useInView(ref);

<motion.div
  ref={ref}
  animate={isInView ? { rotate: 360 } : {}}
  transition={{ repeat: Infinity, duration: 2 }}
/>
```

## CSS vs JavaScript Animations

| Aspect | CSS | JavaScript (Framer Motion) |
|--------|-----|---------------------------|
| Performance | Off main thread | Uses requestAnimationFrame |
| Best for | Simple, predetermined | Dynamic, interruptible |
| Interruptibility | Restarts from zero | Maintains velocity |

## Quick Reference Card

```
EASING SELECTION:
├── Entering/Exiting → ease-out
├── Moving on screen → ease-in-out
├── Hover/color → ease
├── Drag/gesture → spring
└── Constant speed → linear

DURATION:
├── Micro (100-150ms)
├── Standard (150-250ms)
├── Modal/Drawer (200-300ms)
└── Page (300-400ms)

PERFORMANCE:
├── Only animate: transform, opacity
├── Use: will-change: transform
└── Avoid: layout properties, heavy blur

ACCESSIBILITY:
└── Always add: @media (prefers-reduced-motion: reduce)
```
