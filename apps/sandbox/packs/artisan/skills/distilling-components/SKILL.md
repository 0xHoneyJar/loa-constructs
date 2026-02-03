---
name: distilling-components
description: Component design patterns - compound components, composition, props API
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Edit
---

# Distilling Components

Best practices for designing React components that are flexible, composable, and maintainable.

## Trigger

```
/distill
```

## Overview

This skill provides guidance on component architecture and API design. Use it when:

- Creating reusable component libraries
- Designing component APIs and props
- Implementing compound component patterns
- Balancing flexibility with simplicity

## Quick Decision Tree

```
Does the component have multiple related parts sharing state?
└── YES → Use compound components

Is the structure fixed with few variations?
└── YES → Use simple props

Do consumers need to control element rendering?
└── YES → Use asChild pattern

Does the component wrap a DOM element?
└── YES → Forward refs and spread props
```

## Workflow

### Phase 1: Choose Component Pattern

#### Compound Components

Use when a component has multiple related parts sharing implicit state:

```jsx
// Good - compound components
<Dialog>
  <Dialog.Trigger>Open</Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Title>Are you sure?</Dialog.Title>
    <Dialog.Description>This action cannot be undone.</Dialog.Description>
    <Dialog.Close>Cancel</Dialog.Close>
  </Dialog.Content>
</Dialog>

// Bad - prop drilling everything
<Dialog
  trigger="Open"
  title="Are you sure?"
  description="This action cannot be undone."
  closeText="Cancel"
/>
```

**When to use compound components:**
- Multiple related elements sharing implicit state
- Components with slots (header, body, footer)
- Components where order/presence of children varies
- When you need flexible composition

**When NOT to use:**
- Simple components with fixed structure
- Components with 1-3 props
- When the structure never changes

#### Simple Props

For straightforward components with minimal variation:

```jsx
<Button variant="primary" size="md">
  Click me
</Button>
```

### Phase 2: Design Props API

#### The Goldilocks Principle

Find the balance between too rigid and too flexible:

```jsx
// Too rigid - no customization
<Button>Click me</Button>

// Too flexible - overwhelming API
<Button
  backgroundColor="#000"
  hoverBackgroundColor="#333"
  activeBackgroundColor="#111"
  borderRadius={4}
  paddingX={16}
  paddingY={8}
  fontSize={14}
  fontWeight={500}
  // ... 30 more props
>
  Click me
</Button>

// Just right - variants + escape hatch
<Button variant="primary" size="md" className="custom-override">
  Click me
</Button>
```

#### Customization Layers

1. **Variants** - Predefined options (primary, secondary, destructive)
2. **Size** - Predefined sizes (sm, md, lg)
3. **className** - Escape hatch for one-off customizations
4. **asChild** - Render as different element (Radix pattern)

#### Consistent Naming

```jsx
// Good - consistent patterns
<Input disabled />
<Button disabled />
<Select disabled />

// Bad - inconsistent
<Input disabled />
<Button isDisabled />
<Select readonly />
```

#### Boolean Props

Use positive names, avoid double negatives:

```jsx
// Good
<Input disabled />
<Modal open />

// Bad
<Input notEnabled />
<Modal isNotClosed />
```

#### Event Handler Naming

Prefix with `on`, use past tense for after-the-fact:

```jsx
// Good
<Input onChange={} onBlur={} />
<Dialog onOpenChange={} onClose={} />

// Bad
<Input handleChange={} blurHandler={} />
```

### Phase 3: Implement Composition

#### Prefer Composition Over Configuration

```jsx
// Good - composable
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content here</CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>

// Bad - configuration object
<Card
  header={{ title: "Title", description: "Description" }}
  content="Content here"
  footer={{ actions: [{ label: "Action", onClick: () => {} }] }}
/>
```

#### Slot Pattern

For components with optional sections:

```jsx
function Card({ children, header, footer }) {
  return (
    <div className="card">
      {header && <div className="card-header">{header}</div>}
      <div className="card-content">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

// Usage
<Card
  header={<h2>Title</h2>}
  footer={<Button>Save</Button>}
>
  Main content
</Card>
```

#### Render Props vs Children

Prefer children for simple cases, render props for complex:

```jsx
// Simple - use children
<Card>
  <CardContent />
</Card>

// Complex with data - render prop
<List
  items={users}
  renderItem={(user) => <UserCard user={user} />}
/>
```

### Phase 4: Add Flexibility Patterns

#### The asChild Pattern

Allow rendering as a different element:

```jsx
// Render as button (default)
<Button>Click me</Button>

// Render as link
<Button asChild>
  <a href="/page">Click me</a>
</Button>

// Render as Next.js Link
<Button asChild>
  <Link href="/page">Click me</Link>
</Button>
```

Implementation using Radix Slot:

```jsx
import { Slot } from "@radix-ui/react-slot";

function Button({ asChild, ...props }) {
  const Comp = asChild ? Slot : "button";
  return <Comp {...props} />;
}
```

#### Forwarding Refs

Always forward refs for components wrapping DOM elements:

```jsx
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => {
    return (
      <button ref={ref} {...props}>
        {children}
      </button>
    );
  }
);
```

#### Spread Remaining Props

Allow passing arbitrary HTML attributes:

```jsx
function Button({ variant, size, className, ...props }) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

// Now these work:
<Button data-testid="submit" aria-label="Submit form">
  Submit
</Button>
```

### Phase 5: Handle State

#### Controlled vs Uncontrolled

Support both patterns:

```jsx
function Input({
  value: controlledValue,
  defaultValue,
  onChange,
  ...props
}) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  function handleChange(e) {
    if (!isControlled) {
      setInternalValue(e.target.value);
    }
    onChange?.(e);
  }

  return <input value={value} onChange={handleChange} {...props} />;
}

// Uncontrolled
<Input defaultValue="hello" />

// Controlled
<Input value={value} onChange={setValue} />
```

#### Default Props

Use sensible defaults that work for 80% of cases:

```jsx
function Button({
  variant = "primary",
  size = "md",
  type = "button", // Not "submit" - safer default
  ...props
}) {
  // ...
}
```

## Component Organization

### File Structure

```
components/
├── button/
│   ├── button.tsx        # Main component
│   ├── button.test.tsx   # Tests
│   └── index.ts          # Public exports
├── card/
│   ├── card.tsx
│   ├── card-header.tsx
│   ├── card-content.tsx
│   └── index.ts
```

### Export Patterns

```tsx
// components/card/index.ts
export { Card } from "./card";
export { CardHeader } from "./card-header";
export { CardContent } from "./card-content";

// Or as compound component
export { Card, CardHeader, CardContent } from "./card";
```

## Anti-Patterns to Avoid

### Prop Explosion

```jsx
// Bad - too many props
<Button
  leftIcon={<Icon />}
  rightIcon={<Arrow />}
  iconSpacing={8}
  iconSize={16}
>
  Click
</Button>

// Good - use children/composition
<Button>
  <Icon /> Click <Arrow />
</Button>
```

### Boolean Prop Variants

```jsx
// Bad - boolean soup
<Button primary large rounded>Click</Button>

// Good - explicit variants
<Button variant="primary" size="lg" radius="full">Click</Button>
```

### Premature Abstraction

Don't create a component until you've copy-pasted it 2-3 times. Wait until patterns emerge.

## Quick Reference Card

```
PATTERN SELECTION:
├── Multiple parts + shared state → Compound components
├── Fixed structure, few props → Simple props
├── Need custom element → asChild pattern
└── Wraps DOM element → Forward refs

PROPS API:
├── Use variants for predefined options
├── Use className as escape hatch
├── Consistent naming (disabled, not isDisabled)
├── Boolean props = positive names
└── Event handlers = on + verb (onChange)

COMPOSITION:
├── Prefer children over config objects
├── Use slots for optional sections
├── Render props for complex data
└── Spread remaining props

ALWAYS:
├── Forward refs on DOM wrappers
├── Support controlled + uncontrolled
├── Sensible defaults (80% case)
└── Export from index.ts
```

## Checklist

```
API Design:
├── [ ] Props use consistent naming
├── [ ] Boolean props are positive
├── [ ] Event handlers prefixed with on
├── [ ] Sensible defaults provided
└── [ ] className escape hatch available

Flexibility:
├── [ ] asChild pattern if element varies
├── [ ] Refs forwarded for DOM wrappers
├── [ ] Remaining props spread
└── [ ] Both controlled/uncontrolled supported

Organization:
├── [ ] Clear file structure
├── [ ] Clean exports from index
├── [ ] Compound components properly composed
└── [ ] No premature abstraction
```
