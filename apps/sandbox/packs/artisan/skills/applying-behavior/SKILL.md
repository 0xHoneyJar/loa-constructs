---
name: applying-behavior
description: Touch, keyboard, and form interaction patterns for accessible UI
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Edit
---

# Applying Behavior

Touch device considerations, keyboard navigation, form patterns, and accessibility fundamentals for interactive UI.

## Trigger

```
/behavior
```

## Overview

This skill provides guidance on making interfaces work well across input methods and devices. Use it when:

- Building touch-friendly interfaces
- Implementing keyboard navigation
- Creating accessible forms
- Ensuring cross-device compatibility

## Workflow

### Phase 1: Touch Device Considerations

#### Hover Effects

Disable hover effects on touch devices. Touch triggers hover on tap, causing false positives:

```css
/* Only apply hover on devices that support it */
@media (hover: hover) and (pointer: fine) {
  .element:hover {
    transform: scale(1.05);
  }
}
```

**Important:** Don't rely on hover effects for UI to work. Hover should enhance, not enable functionality.

#### Tap Targets

Ensure minimum 44px tap targets on all interactive elements:

```css
.icon-button {
  /* Visual size can be smaller */
  width: 24px;
  height: 24px;
  position: relative;
}

/* But hit area should be 44px */
.icon-button::before {
  content: '';
  position: absolute;
  inset: -10px;
}
```

Or use minimum dimensions:

```css
.small-button {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

#### Touch Action

For custom gestures, disable native behavior:

```css
/* Disable all touch behaviors for custom canvas */
.custom-canvas {
  touch-action: none;
}

/* Prevent double-tap zoom on controls */
button, a, input {
  touch-action: manipulation;
}
```

#### Video Autoplay on iOS

Apply `muted` and `playsinline` for autoplay without fullscreen:

```html
<video autoplay muted playsinline loop>
  <source src="video.mp4" type="video/mp4" />
</video>
```

#### OS-Specific Shortcuts

Show correct modifier key based on OS:

```js
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? 'Cmd' : 'Ctrl';

// Display: "Save (Cmd+S)" on Mac, "Save (Ctrl+S)" on Windows
```

### Phase 2: Keyboard Navigation

#### Tab Order

Ensure consistent tabbing through visible elements only:

```css
/* Hide from tab order when not visible */
.hidden-panel {
  visibility: hidden;
}
```

```jsx
/* Or use inert attribute */
<div inert={!isVisible}>...</div>
```

#### Scroll Into View

Ensure focused elements are visible:

```jsx
function handleFocus(e) {
  e.target.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
  });
}
```

#### Focus Management

When opening modals:
1. Move focus to first interactive element or modal itself
2. Trap focus within modal
3. Return focus to trigger element on close

```jsx
function Modal({ isOpen, onClose, triggerRef }) {
  const modalRef = useRef();

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div ref={modalRef} tabIndex={-1} role="dialog">
      {/* Modal content */}
    </div>
  );
}
```

### Phase 3: Form Patterns

#### Labels

Always associate labels with inputs:

```html
<label for="email">Email</label>
<input id="email" type="email" />

<!-- Or wrap the input -->
<label>
  Email
  <input type="email" />
</label>
```

#### Input Types

Use appropriate types for mobile keyboards:

```html
<input type="email" />    <!-- Email keyboard -->
<input type="tel" />      <!-- Phone keypad -->
<input type="url" />      <!-- URL keyboard -->
<input type="number" />   <!-- Numeric keypad -->
<input type="search" />   <!-- Search with clear -->
```

#### iOS Font Size

Ensure 16px minimum to prevent zoom on focus:

```css
input, textarea, select {
  font-size: 16px;
}
```

#### Input Decorations

Position icons absolutely, not as siblings:

```css
.input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.input-field {
  padding-left: 40px;
}
```

#### Autofocus

Don't autofocus on touch devices:

```jsx
const isTouchDevice = 'ontouchstart' in window;

<input autoFocus={!isTouchDevice} />
```

#### Form Submission

Wrap inputs with `<form>` for Enter key submission:

```html
<form onSubmit={handleSubmit}>
  <input type="text" />
  <button type="submit">Submit</button>
</form>
```

Support Cmd/Ctrl+Enter for textareas:

```jsx
function handleKeyDown(e) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    handleSubmit();
  }
}
```

#### 1Password/Autocomplete Control

Disable password managers when not needed:

```html
<input
  data-lpignore="true"
  data-1p-ignore
  spellcheck="false"
  autocomplete="off"
/>
```

### Phase 4: Accessibility

#### ARIA Labels

Always set labels on icon buttons:

```html
<button aria-label="Close dialog">
  <CloseIcon />
</button>

<button aria-label="Search">
  <SearchIcon />
</button>
```

#### Code Illustrations

Decorative code-built illustrations need ARIA:

```jsx
<div
  role="img"
  aria-label="Abstract geometric pattern"
  className="decorative-illustration"
/>
```

#### Reduced Motion

Support `prefers-reduced-motion`:

```jsx
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

<video
  autoPlay={!prefersReducedMotion}
  controls={prefersReducedMotion}
  muted
  playsinline
/>
```

#### Time-Limited Actions

Pause timers when tab is hidden:

```js
let timeoutId;
let remainingTime;
let startTime;

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearTimeout(timeoutId);
    remainingTime -= Date.now() - startTime;
  } else {
    startTime = Date.now();
    timeoutId = setTimeout(callback, remainingTime);
  }
});
```

### Phase 5: Button Patterns

#### Semantic Elements

Always use `<button>` for buttons:

```html
<!-- Good -->
<button onClick={handleClick}>Click me</button>

<!-- Bad -->
<div onClick={handleClick}>Click me</div>
```

#### Disabled After Submission

Prevent duplicate requests:

```jsx
const [isSubmitting, setIsSubmitting] = useState(false);

<button
  disabled={isSubmitting}
  onClick={async () => {
    setIsSubmitting(true);
    await submitForm();
    setIsSubmitting(false);
  }}
>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</button>
```

#### Press Feel

Add scale on active for responsiveness:

```css
.button:active {
  transform: scale(0.97);
}
```

### Phase 6: Tooltips & Menus

#### Tooltip Delay

Add delay to prevent accidental activation:

```css
.tooltip {
  transition-delay: 200ms;
}
```

**Sequential tooltips:** Skip delay after first tooltip opens:

```jsx
const [isWarm, setIsWarm] = useState(false);

// When any tooltip opens, set warm state
// Clear warm state after 300ms of no tooltip
```

#### Submenu Safe Zones

Allow diagonal cursor movement to submenus:

```css
.submenu-trigger::after {
  content: '';
  position: absolute;
  clip-path: polygon(0 0, 100% 0, 100% 100%);
}
```

#### Checkbox Dead Zones

Make entire row clickable:

```html
<label class="checkbox-row">
  <input type="checkbox" />
  <span>Remember me</span>
</label>
```

## Quick Reference Card

```
TOUCH:
├── @media (hover: hover) for hover effects
├── 44px minimum tap targets
├── touch-action: manipulation on controls
├── muted + playsinline for video autoplay
└── Detect OS for shortcut display

KEYBOARD:
├── visibility: hidden hides from tab order
├── inert attribute for inactive sections
├── scrollIntoView on focus
└── Focus trap in modals

FORMS:
├── Labels associated with inputs
├── Correct input types for keyboards
├── 16px minimum font (iOS zoom)
├── <form> wrapper for Enter submission
└── No autofocus on touch devices

ACCESSIBILITY:
├── aria-label on icon buttons
├── role="img" + aria-label on decorative
├── prefers-reduced-motion support
└── Pause timers on tab hide

BUTTONS:
├── Always use <button> element
├── Disable during submission
└── transform: scale(0.97) on :active
```

## Checklist

```
Touch:
├── [ ] Hover effects gated by @media (hover: hover)
├── [ ] All tap targets >= 44px
├── [ ] touch-action set appropriately
└── [ ] Videos have muted + playsinline

Keyboard:
├── [ ] Tab order is logical
├── [ ] Hidden elements removed from tab order
├── [ ] Focus managed in modals
└── [ ] Scroll into view on focus

Forms:
├── [ ] All inputs have labels
├── [ ] Correct input types used
├── [ ] Font size >= 16px
├── [ ] Form wrapper for submission
└── [ ] No autofocus on touch

Accessibility:
├── [ ] Icon buttons have aria-label
├── [ ] Reduced motion supported
├── [ ] Timers pause when hidden
└── [ ] Semantic elements used
```
