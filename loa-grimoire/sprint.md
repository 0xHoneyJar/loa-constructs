# Sprint Plan: Loa Constructs

**Version**: 2.0.0
**Date**: 2026-01-02
**Author**: Sprint Planner Agent
**Status**: Ready for Implementation

---

## Sprint Overview

### Project Summary

Transform the Loa Constructs web application from a standard GUI dashboard to a TUI-style (Terminal User Interface) design that emulates the visual appearance of a terminal. The design reference is `loa-grimoire/context/loa-constructs.html` which implements this aesthetic using pure HTML/CSS with minimal JavaScript.

### Design Goals

1. **TUI Aesthetic**: Emulate a terminal environment, not a graphical UI
2. **Minimal Dependencies**: Reduce reliance on UI frameworks - use vanilla CSS where possible
3. **Keyboard Navigation**: Full keyboard control with vim-style keybindings
4. **IBM Plex Mono**: Monospace typography throughout
5. **Transparent Panels**: Semi-transparent boxes with visible background
6. **JWST Background**: Space imagery with low opacity
7. **Scanlines Effect**: CRT-style overlay for authenticity

### Sprint Configuration

| Parameter | Value |
|-----------|-------|
| **Sprint Count** | 3 (Sprints 18-20) |
| **Estimated Duration** | 3-4 days |
| **Total Effort** | ~24-32 hours |
| **Team Size** | 1 engineer |
| **Risk Level** | Medium |

### Success Criteria

- [ ] All pages use TUI styling consistent with the HTML prototype
- [ ] Keyboard navigation works throughout the app (arrows, numbers, vim keys)
- [ ] IBM Plex Mono font loaded and applied globally
- [ ] JWST background visible behind transparent panels
- [ ] Scanlines effect renders correctly
- [ ] Mobile responsive (sidebar collapses, simplified layout)
- [ ] No increase in Lighthouse performance score degradation
- [ ] All existing functionality preserved (auth, skills, packs, billing)

---

## Sprint 18: TUI Foundation & Global Styles

**Goal**: Establish the core TUI design system, global styles, and font configuration. Create reusable TUI components.

**Duration**: 1 day

### Tasks

---

#### T18.1: Replace Font System with IBM Plex Mono

**Description**: Remove Inter font, add IBM Plex Mono from Google Fonts, and configure as the primary font family.

**Acceptance Criteria**:
- [ ] Add IBM Plex Mono font via Google Fonts (400, 500, 600 weights)
- [ ] Update `layout.tsx` to use IBM Plex Mono
- [ ] Remove Inter font configuration
- [ ] Apply monospace font family to all text elements
- [ ] Set base font-size to 14px

**Effort**: Small (1 hour)

**Dependencies**: None

**Files to Modify**:
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/globals.css`

---

#### T18.2: Create TUI Color Palette & CSS Variables

**Description**: Define the TUI color scheme using CSS custom properties, matching the prototype.

**Acceptance Criteria**:
- [ ] Define color variables in `globals.css`:
  - `--bg: #0a0a0a` (background)
  - `--fg: #c0c0c0` (foreground/text)
  - `--fg-bright: #ffffff` (bright text)
  - `--fg-dim: #606060` (dimmed text)
  - `--accent: #5fafff` (blue accent)
  - `--green: #5fff87` (success/code)
  - `--yellow: #ffff5f` (warning)
  - `--red: #ff5f5f` (error)
  - `--cyan: #5fffff` (links)
  - `--border: #5f5f5f` (box borders)
  - `--selection-bg: #5fafff` (selection background)
  - `--selection-fg: #000000` (selection text)
- [ ] Apply dark background to html/body
- [ ] Configure text selection styles

**Effort**: Small (1 hour)

**Dependencies**: T18.1

**Files to Modify**:
- `apps/web/src/app/globals.css`

---

#### T18.3: Add JWST Background & Scanlines Effect

**Description**: Implement the space imagery background with low opacity and CRT scanlines overlay.

**Acceptance Criteria**:
- [ ] Add JWST image as fixed background via `body::before`
- [ ] Set background opacity to ~0.3 (visible but not distracting)
- [ ] Implement scanlines via `body::after` with repeating gradient
- [ ] Scanlines should be non-interactive (pointer-events: none)
- [ ] Background and scanlines should cover full viewport
- [ ] Ensure proper z-index layering (bg < content < scanlines)

**Effort**: Small (1 hour)

**Dependencies**: T18.2

**Files to Modify**:
- `apps/web/src/app/globals.css`

---

#### T18.4: Create TUI Box Component

**Description**: Create a reusable `TuiBox` component that renders a bordered container with optional title, matching the prototype's `.box` styling.

**Acceptance Criteria**:
- [ ] Create `apps/web/src/components/tui/tui-box.tsx`
- [ ] Component accepts props: `title`, `className`, `children`
- [ ] Renders semi-transparent background (`rgba(0, 0, 0, 0.75)`)
- [ ] Renders 1px solid border using `--border` color
- [ ] Title appears as inline element positioned over top border
- [ ] Content area is scrollable with hidden scrollbar
- [ ] Component uses CSS modules or inline styles (minimal JS)

**Effort**: Medium (2 hours)

**Dependencies**: T18.2

**Files to Create**:
- `apps/web/src/components/tui/tui-box.tsx`
- `apps/web/src/components/tui/tui-box.module.css` (optional)

---

#### T18.5: Create TUI Navigation Item Component

**Description**: Create a `TuiNavItem` component for sidebar navigation with keyboard navigation support.

**Acceptance Criteria**:
- [ ] Create `apps/web/src/components/tui/tui-nav-item.tsx`
- [ ] Props: `href`, `label`, `shortcut`, `active`, `indicator`
- [ ] Active state: blue background, black text
- [ ] Hover state: slight blue tint background
- [ ] Shows `▸` indicator for active item, space for inactive
- [ ] Shows keyboard shortcut on right side (e.g., `[1]`)
- [ ] Uses `next/link` for navigation

**Effort**: Small (1 hour)

**Dependencies**: T18.2

**Files to Create**:
- `apps/web/src/components/tui/tui-nav-item.tsx`

---

#### T18.6: Create TUI Status Bar Component

**Description**: Create a bottom status bar component showing keyboard hints and meta information.

**Acceptance Criteria**:
- [ ] Create `apps/web/src/components/tui/tui-status-bar.tsx`
- [ ] Renders fixed at bottom of viewport
- [ ] Left side: keyboard shortcuts (↑↓ navigate, Enter select, etc.)
- [ ] Right side: version info, external links
- [ ] Semi-transparent background matching boxes
- [ ] Keyboard hints use `<kbd>` elements with border styling

**Effort**: Small (1 hour)

**Dependencies**: T18.2

**Files to Create**:
- `apps/web/src/components/tui/tui-status-bar.tsx`

---

#### T18.7: Create TUI Typography Components

**Description**: Create styled text components for headings, paragraphs, links, and code blocks.

**Acceptance Criteria**:
- [ ] Create `apps/web/src/components/tui/tui-text.tsx` with:
  - `TuiH1` - Green text, 14px, font-weight 600
  - `TuiH2` - Blue accent, 14px, with bottom border
  - `TuiP` - Normal foreground color
  - `TuiLink` - Cyan text, underline on hover
  - `TuiCode` - Green text, dark background, border
  - `TuiDivider` - Horizontal line made of `─` characters
- [ ] All use the same 14px base font size (monospace scale)
- [ ] Export all from single file

**Effort**: Medium (2 hours)

**Dependencies**: T18.2

**Files to Create**:
- `apps/web/src/components/tui/tui-text.tsx`

---

#### T18.8: Create TUI Button Component

**Description**: Create a button component styled like terminal UI buttons.

**Acceptance Criteria**:
- [ ] Create `apps/web/src/components/tui/tui-button.tsx`
- [ ] Props: `variant` (primary, secondary, danger), `disabled`, `onClick`
- [ ] Border-style buttons (no heavy backgrounds)
- [ ] Primary: accent border and text
- [ ] Hover: inverted colors (accent bg, black text)
- [ ] Keyboard accessible (focus ring visible)

**Effort**: Small (1 hour)

**Dependencies**: T18.2

**Files to Create**:
- `apps/web/src/components/tui/tui-button.tsx`

---

#### T18.9: Create TUI Input Components

**Description**: Create form input components styled for terminal aesthetic.

**Acceptance Criteria**:
- [ ] Create `apps/web/src/components/tui/tui-input.tsx`
- [ ] Create `apps/web/src/components/tui/tui-select.tsx`
- [ ] Transparent background with border
- [ ] Monospace text
- [ ] Focus state: accent border color
- [ ] Error state: red border color
- [ ] Label above input with dim color

**Effort**: Medium (2 hours)

**Dependencies**: T18.2

**Files to Create**:
- `apps/web/src/components/tui/tui-input.tsx`
- `apps/web/src/components/tui/tui-select.tsx`

---

### Sprint 18 Summary

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| T18.1 | IBM Plex Mono font | S | ✅ Complete |
| T18.2 | TUI color palette | S | ✅ Complete |
| T18.3 | JWST background & scanlines | S | ✅ Complete |
| T18.4 | TUI Box component | M | ✅ Complete |
| T18.5 | TUI Nav Item component | S | ✅ Complete |
| T18.6 | TUI Status Bar component | S | ✅ Complete |
| T18.7 | TUI Typography components | M | ✅ Complete |
| T18.8 | TUI Button component | S | ✅ Complete |
| T18.9 | TUI Input components | M | ✅ Complete |

**Total Estimated Effort**: ~12 hours

---

## Sprint 19: Dashboard & Navigation Redesign

**Goal**: Redesign the main dashboard layout, sidebar navigation, and implement keyboard navigation system.

**Duration**: 1 day

### Tasks

---

#### T19.1: Create TUI Layout Shell

**Description**: Create the main layout structure with sidebar, content area, and status bar.

**Acceptance Criteria**:
- [ ] Create `apps/web/src/components/tui/tui-layout.tsx`
- [ ] Three-panel layout: sidebar (fixed width), content (flex), status bar (fixed bottom)
- [ ] All panels use `TuiBox` component
- [ ] Proper z-index layering with background effects
- [ ] Mobile: sidebar collapses to hamburger menu

**Effort**: Medium (2 hours)

**Dependencies**: T18.4, T18.6

**Files to Create**:
- `apps/web/src/components/tui/tui-layout.tsx`

---

#### T19.2: Implement Global Keyboard Navigation Hook

**Description**: Create a React hook for handling global keyboard shortcuts throughout the app.

**Acceptance Criteria**:
- [ ] Create `apps/web/src/hooks/use-keyboard-nav.ts`
- [ ] Support arrow keys (up/down) for item navigation
- [ ] Support number keys (1-9) for direct section jump
- [ ] Support vim keys (j/k) as alternative navigation
- [ ] Support Enter for selection
- [ ] Support `g` for go to top, `G` for go to bottom
- [ ] Ignore when focus is on input/textarea elements
- [ ] Provide current index and navigation functions

**Effort**: Medium (2-3 hours)

**Dependencies**: None

**Files to Create**:
- `apps/web/src/hooks/use-keyboard-nav.ts`

---

#### T19.3: Redesign Dashboard Sidebar

**Description**: Replace existing sidebar with TUI-styled navigation using `TuiNavItem` components.

**Acceptance Criteria**:
- [ ] Replace `apps/web/src/components/dashboard/sidebar.tsx`
- [ ] Use `TuiBox` with title "≡ Menu"
- [ ] Navigation items:
  - Overview [1]
  - Skills [2]
  - Packs [3]
  - API Keys [4]
  - Profile [5]
  - Billing [6]
- [ ] Integrate keyboard navigation hook
- [ ] Show active route with `▸` indicator
- [ ] User info at bottom (name, tier badge)

**Effort**: Medium (2 hours)

**Dependencies**: T19.1, T19.2

**Files to Modify**:
- `apps/web/src/components/dashboard/sidebar.tsx`

---

#### T19.4: Redesign Dashboard Header

**Description**: Simplify header to match TUI aesthetic - minimal, no heavy branding.

**Acceptance Criteria**:
- [ ] Replace or remove heavy header
- [ ] Show current section title in content box title
- [ ] Move user actions to sidebar or status bar
- [ ] Mobile: add hamburger menu trigger

**Effort**: Small (1 hour)

**Dependencies**: T19.1

**Files to Modify**:
- `apps/web/src/components/dashboard/header.tsx`

---

#### T19.5: Update Dashboard Layout Page

**Description**: Integrate new TUI layout into the dashboard layout component.

**Acceptance Criteria**:
- [ ] Update `apps/web/src/app/(dashboard)/layout.tsx`
- [ ] Use `TuiLayout` as wrapper
- [ ] Pass children to content area
- [ ] Ensure auth context still works
- [ ] Update any layout-specific styling

**Effort**: Medium (2 hours)

**Dependencies**: T19.1, T19.3, T19.4

**Files to Modify**:
- `apps/web/src/app/(dashboard)/layout.tsx`

---

#### T19.6: Create TUI List Component for Skills/Packs

**Description**: Create a list component for displaying skills and packs in TUI style.

**Acceptance Criteria**:
- [ ] Create `apps/web/src/components/tui/tui-list.tsx`
- [ ] Each item shows: title, meta info, description
- [ ] Arrow indicator (`→`) on hover
- [ ] Support keyboard navigation within list
- [ ] Focused item has background highlight
- [ ] Click or Enter navigates to detail page

**Effort**: Medium (2 hours)

**Dependencies**: T19.2

**Files to Create**:
- `apps/web/src/components/tui/tui-list.tsx`

---

#### T19.7: Redesign Skill Card Component

**Description**: Replace graphical skill cards with TUI-styled list items.

**Acceptance Criteria**:
- [ ] Replace `apps/web/src/components/dashboard/skill-card.tsx`
- [ ] Use `TuiList` item styling
- [ ] Show: skill name, version, category tag (cyan), description
- [ ] Tier badge if premium
- [ ] Download count in dim text

**Effort**: Medium (2 hours)

**Dependencies**: T19.6

**Files to Modify**:
- `apps/web/src/components/dashboard/skill-card.tsx`

---

### Sprint 19 Summary

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| T19.1 | TUI Layout Shell | M | ✅ Complete |
| T19.2 | Keyboard Navigation Hook | M | ✅ Complete |
| T19.3 | Dashboard Sidebar | M | ✅ Complete |
| T19.4 | Dashboard Header | S | ✅ Complete |
| T19.5 | Dashboard Layout Page | M | ✅ Complete |
| T19.6 | TUI List Component | M | ✅ Complete |
| T19.7 | Skill Card Redesign | M | ✅ Complete |

**Total Estimated Effort**: ~12 hours

---

## Sprint 20: Page Redesigns & Polish

**Goal**: Redesign individual pages, add polish effects, and ensure mobile responsiveness.

**Duration**: 1-2 days

### Tasks

---

#### T20.1: Redesign Skills Browse Page

**Description**: Update the skills listing page with TUI styling.

**Acceptance Criteria**:
- [ ] Update `apps/web/src/app/(dashboard)/skills/page.tsx`
- [ ] Use `TuiList` for skill display
- [ ] Search input uses `TuiInput`
- [ ] Filters use `TuiSelect` or tab-style buttons
- [ ] Pagination styled as terminal commands

**Effort**: Medium (2 hours)

**Dependencies**: T19.6, T18.9

**Files to Modify**:
- `apps/web/src/app/(dashboard)/skills/page.tsx`
- `apps/web/src/components/dashboard/skill-filters.tsx`
- `apps/web/src/components/dashboard/search-input.tsx`

---

#### T20.2: Redesign Skill Detail Page

**Description**: Update individual skill page with TUI styling.

**Acceptance Criteria**:
- [ ] Update `apps/web/src/app/(dashboard)/skills/[slug]/page.tsx`
- [ ] Skill name as `TuiH1` with blinking cursor
- [ ] Metadata in status table format
- [ ] Install command in code block
- [ ] Version history as list
- [ ] Back navigation via keyboard (`q` or `Escape`)

**Effort**: Medium (2 hours)

**Dependencies**: T18.7, T18.4

**Files to Modify**:
- `apps/web/src/app/(dashboard)/skills/[slug]/page.tsx`

---

#### T20.3: Redesign Authentication Pages

**Description**: Update login and register pages with TUI styling.

**Acceptance Criteria**:
- [ ] Update `apps/web/src/app/(auth)/` pages
- [ ] Centered `TuiBox` with form
- [ ] Minimal branding (text logo only)
- [ ] Form inputs use `TuiInput`
- [ ] Submit button uses `TuiButton`
- [ ] Error messages in red
- [ ] Success in green

**Effort**: Medium (2 hours)

**Dependencies**: T18.8, T18.9

**Files to Modify**:
- `apps/web/src/app/(auth)/layout.tsx`
- Auth page components

---

#### T20.4: Redesign Profile Page

**Description**: Update user profile page with TUI styling.

**Acceptance Criteria**:
- [ ] Update `apps/web/src/app/(dashboard)/profile/page.tsx`
- [ ] User info in status table format
- [ ] Form fields use TUI components
- [ ] Subscription info displayed clearly

**Effort**: Small (1.5 hours)

**Dependencies**: T18.9

**Files to Modify**:
- `apps/web/src/app/(dashboard)/profile/page.tsx`

---

#### T20.5: Redesign Billing Page

**Description**: Update billing and subscription pages with TUI styling.

**Acceptance Criteria**:
- [ ] Update billing pages
- [ ] Pricing comparison uses `.comparison` style from prototype
- [ ] Current plan highlighted with green border
- [ ] Feature lists with check/x indicators

**Effort**: Medium (2 hours)

**Dependencies**: T18.7

**Files to Modify**:
- `apps/web/src/app/(dashboard)/billing/page.tsx`
- `apps/web/src/app/(dashboard)/teams/[slug]/billing/page.tsx`

---

#### T20.6: Redesign API Keys Page

**Description**: Update API keys management page with TUI styling.

**Acceptance Criteria**:
- [ ] Update `apps/web/src/app/(dashboard)/api-keys/page.tsx`
- [ ] Keys displayed in code block style
- [ ] Copy button matches prototype style
- [ ] Create/delete actions use TUI buttons

**Effort**: Small (1.5 hours)

**Dependencies**: T18.7, T18.8

**Files to Modify**:
- `apps/web/src/app/(dashboard)/api-keys/page.tsx`

---

#### T20.7: Add Blinking Cursor Effect

**Description**: Add the animated blinking cursor effect for headings and active elements.

**Acceptance Criteria**:
- [ ] Create cursor CSS animation in globals.css
- [ ] Cursor blinks at 1s interval
- [ ] Can be added to any element via class
- [ ] Use on main headings for terminal feel

**Effort**: Small (0.5 hours)

**Dependencies**: T18.2

**Files to Modify**:
- `apps/web/src/app/globals.css`

---

#### T20.8: Mobile Responsive Adjustments

**Description**: Ensure TUI design works on mobile devices.

**Acceptance Criteria**:
- [ ] Sidebar collapses on mobile (< 768px)
- [ ] Hamburger menu to toggle sidebar
- [ ] Feature grids stack to single column
- [ ] Status bar keyboard hints hidden on mobile
- [ ] Touch scrolling works in content areas

**Effort**: Medium (2 hours)

**Dependencies**: T19.1

**Files to Modify**:
- Various component files
- `apps/web/src/app/globals.css`

---

#### T20.9: Update Landing Page (Public)

**Description**: Redesign the public landing page to match TUI aesthetic.

**Acceptance Criteria**:
- [ ] Update `apps/web/src/app/page.tsx`
- [ ] Match the prototype's overview section
- [ ] Quick install tabs (cargo/brew/curl - adapt for npm/pnpm)
- [ ] Feature comparison columns
- [ ] Status table with project stats
- [ ] CTA buttons use TUI style

**Effort**: Medium (2-3 hours)

**Dependencies**: T18.4, T18.7

**Files to Modify**:
- `apps/web/src/app/page.tsx`

---

#### T20.10: Remove Unused UI Components

**Description**: Clean up old shadcn/radix components that are no longer used.

**Acceptance Criteria**:
- [ ] Identify unused components in `components/ui/`
- [ ] Remove or refactor to use TUI equivalents
- [ ] Keep only essential radix primitives if needed for accessibility
- [ ] Update imports throughout app

**Effort**: Small (1 hour)

**Dependencies**: All other Sprint 20 tasks

**Files to Modify**:
- `apps/web/src/components/ui/*`

---

### Sprint 20 Summary

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| T20.1 | Skills Browse Page | M | ✅ Complete |
| T20.2 | Skill Detail Page | M | ✅ Complete |
| T20.3 | Auth Pages | M | ✅ Complete |
| T20.4 | Profile Page | S | ✅ Complete |
| T20.5 | Billing Page | M | ✅ Complete |
| T20.6 | API Keys Page | S | ✅ Complete |
| T20.7 | Blinking Cursor | S | ✅ Complete |
| T20.8 | Mobile Responsive | M | ✅ Complete |
| T20.9 | Landing Page | M | ✅ Complete |
| T20.10 | Cleanup Old UI | S | ✅ Complete |

**Total Estimated Effort**: ~16 hours

---

## Dependency Graph

```
Sprint 18: Foundation
T18.1 (Font)
  │
  ▼
T18.2 (Colors)
  │
  ├─────────────┬─────────────┬─────────────┬─────────────┐
  ▼             ▼             ▼             ▼             ▼
T18.3 (BG)   T18.4 (Box)  T18.5 (Nav)  T18.7 (Text)  T18.8 (Btn)
              │             │                          │
              │             │                          ▼
              │             │                       T18.9 (Input)
              └──────┬──────┘
                     │
Sprint 19: Layout    ▼
              T19.1 (Layout)
                │    │
                │    ▼
                │  T19.2 (Keyboard)
                │    │
                └────┼─────────────────┐
                     │                 │
                     ▼                 ▼
              T19.3 (Sidebar)    T19.6 (List)
                     │                 │
                     ▼                 ▼
              T19.4 (Header)    T19.7 (Card)
                     │
                     ▼
              T19.5 (Dashboard)

Sprint 20: Pages
T20.1 → T20.2 → T20.3 → T20.4 → T20.5 → T20.6
                                          │
                                          ▼
                        T20.7 → T20.8 → T20.9 → T20.10
```

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Accessibility concerns with low contrast | High | Medium | Test with a11y tools, ensure sufficient contrast ratios |
| Performance impact of background image | Medium | Low | Optimize image, use WebP, lazy load |
| Keyboard nav conflicts with form inputs | High | Medium | Properly detect focus state in hook |
| Tailwind CSS conflicts with custom styles | Medium | Medium | Use CSS modules or !important where needed |
| Mobile UX degradation | Medium | Medium | Test on real devices, progressive enhancement |

---

## Technical Notes

### CSS Strategy

Given the requirement for minimal dependencies, consider:

1. **Option A**: Keep Tailwind but create a TUI preset
   - Pro: Familiar tooling, utility classes
   - Con: Still adds bundle size

2. **Option B**: Replace Tailwind with pure CSS modules
   - Pro: Minimal bundle, matches requirement
   - Con: More verbose, lose utility classes

3. **Recommended (Hybrid)**: Keep Tailwind for layout utilities (`flex`, `grid`, `p-`, `m-`) but use custom CSS for TUI-specific styles via CSS modules or globals.

### Font Loading

```tsx
// layout.tsx
import { IBM_Plex_Mono } from 'next/font/google';

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});
```

### Background Image Optimization

```css
body::before {
  background-image: url('/images/jwst-background.webp');
  /* Use local optimized WebP instead of external URL */
  /* Consider using next/image for automatic optimization */
}
```

### Keyboard Navigation Pattern

```tsx
// Basic pattern for keyboard navigation
const { currentIndex, setCurrentIndex } = useKeyboardNav({
  items: menuItems,
  onSelect: (index) => router.push(menuItems[index].href),
  shortcuts: {
    '1': 0, '2': 1, '3': 2, // etc.
  },
});
```

---

## Definition of Done

Sprint is complete when:

1. **Visual Match**: UI closely resembles the HTML prototype
2. **Keyboard Works**: All navigation functional via keyboard
3. **Font Applied**: IBM Plex Mono renders correctly
4. **Background Visible**: JWST image and scanlines render
5. **Mobile Works**: Responsive design functions on phones
6. **Auth Works**: Login/logout flows unchanged
7. **Data Works**: Skills, packs, billing all display correctly
8. **Performance OK**: No significant Lighthouse regression
9. **Accessibility OK**: Basic a11y checks pass (focus visible, contrast)

---

## Post-Sprint Actions

1. **User Testing**: Get feedback on keyboard navigation UX
2. **Performance Audit**: Run Lighthouse, optimize as needed
3. **A11y Audit**: Run axe or similar, fix critical issues
4. **Documentation**: Update README with new UI architecture
5. **Component Library**: Consider extracting TUI components to shared package

---

## Reference Files

### Design Reference
- `loa-grimoire/context/loa-constructs.html` - Complete TUI prototype

### Inspiration Sources
- [dotstate](https://github.com/serkanyersen/dotstate) - Original inspiration
- [Terminal Trove](https://terminaltrove.com) - Gallery of TUI apps

### Key Patterns from Prototype

```css
/* Box pattern */
.box {
  background: rgba(0, 0, 0, 0.75);
  position: relative;
}
.box::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid var(--border);
  pointer-events: none;
}
.box-title {
  position: absolute;
  top: -1px;
  left: 16px;
  background: rgba(0, 0, 0, 0.75);
  padding: 0 8px;
  color: var(--accent);
}
```

```css
/* Navigation item pattern */
.nav-item.active {
  background: var(--accent);
  color: #000;
}
.nav-item .indicator {
  display: inline-block;
  width: 20px;
}
```

```css
/* Status bar pattern */
.statusbar kbd {
  background: transparent;
  border: 1px solid var(--border);
  padding: 0 4px;
  font-family: inherit;
}
```

---

## Sprint 21: Production Deployment

**Goal**: Deploy the complete platform to production - API on Fly.io, Web on Vercel, with full DNS and HTTPS configuration.

**Duration**: 1 day

### Sprint Configuration

| Parameter | Value |
|-----------|-------|
| **Domains** | `constructs.network` (web), `api.constructs.network` (API) |
| **API Host** | Fly.io (loa-constructs-api) |
| **Web Host** | Vercel |
| **Database** | Neon PostgreSQL (already configured) |
| **Risk Level** | Medium |

### Tasks

---

#### T21.1: Deploy API to Fly.io

**Description**: Deploy the Hono API to Fly.io production environment.

**Acceptance Criteria**:
- [ ] Fly CLI installed and authenticated
- [ ] Secrets configured (DATABASE_URL, JWT_SECRET)
- [ ] Deploy completes successfully
- [ ] Health check passes at `/v1/health`
- [ ] API responds at `https://loa-constructs-api.fly.dev/v1/health`

**Effort**: Small (30 min)

**Dependencies**: None

**Commands**:
```bash
cd apps/api
fly auth login
fly secrets set DATABASE_URL="..." JWT_SECRET="..."
fly deploy
```

---

#### T21.2: Configure Vercel Project for Web App

**Description**: Set up Vercel project and configuration for the Next.js web app.

**Acceptance Criteria**:
- [ ] Create `vercel.json` with monorepo configuration
- [ ] Configure root directory as `apps/web`
- [ ] Set build output directory
- [ ] Configure environment variables for API URL
- [ ] Test build locally with `vercel build`

**Effort**: Small (30 min)

**Dependencies**: None

**Files to Create**:
- `apps/web/vercel.json`

---

#### T21.3: Deploy Web App to Vercel

**Description**: Deploy the Next.js web app to Vercel production.

**Acceptance Criteria**:
- [ ] Vercel CLI installed (`npm i -g vercel`)
- [ ] Link project to Vercel account
- [ ] Set environment variables (NEXT_PUBLIC_API_URL)
- [ ] Deploy to production
- [ ] Verify site loads at Vercel URL

**Effort**: Small (30 min)

**Dependencies**: T21.1, T21.2

**Commands**:
```bash
cd apps/web
vercel --prod
```

---

#### T21.4: Configure Custom Domain for Web (constructs.network)

**Description**: Configure the `constructs.network` domain to point to Vercel.

**Acceptance Criteria**:
- [ ] Add domain in Vercel dashboard
- [ ] Configure DNS records (A/CNAME) at registrar
- [ ] Verify domain propagation
- [ ] HTTPS certificate issued automatically
- [ ] Site accessible at `https://constructs.network`

**Effort**: Small (30 min)

**Dependencies**: T21.3

---

#### T21.5: Configure Custom Domain for API (api.constructs.network)

**Description**: Configure the `api.constructs.network` subdomain to point to Fly.io.

**Acceptance Criteria**:
- [ ] Create SSL certificate in Fly.io
- [ ] Add custom domain to Fly app
- [ ] Configure DNS CNAME at registrar
- [ ] Verify domain propagation
- [ ] API accessible at `https://api.constructs.network/v1/health`

**Effort**: Small (30 min)

**Dependencies**: T21.1

**Commands**:
```bash
fly certs create api.constructs.network --app loa-constructs-api
```

---

#### T21.6: Update Environment Variables for Production URLs

**Description**: Update both apps to use production URLs instead of localhost/fly.dev URLs.

**Acceptance Criteria**:
- [ ] Web app's NEXT_PUBLIC_API_URL set to `https://api.constructs.network`
- [ ] API's DASHBOARD_URL set to `https://constructs.network`
- [ ] API's API_URL set to `https://api.constructs.network`
- [ ] OAuth redirect URLs updated (if OAuth enabled)
- [ ] CORS configured for production domain

**Effort**: Small (30 min)

**Dependencies**: T21.4, T21.5

---

#### T21.7: Seed Production Users

**Description**: Create initial user accounts for THJ team in production.

**Acceptance Criteria**:
- [ ] Run seed-thj-team.ts with production DATABASE_URL
- [ ] Verify users exist in database
- [ ] Verify subscriptions are granted
- [ ] Test login with seeded account

**Effort**: Small (30 min)

**Dependencies**: T21.1

**Commands**:
```bash
DATABASE_URL="..." npx tsx scripts/seed-thj-team.ts
```

---

#### T21.8: Verify GTM Collective Pack in Production

**Description**: Ensure the GTM Collective pack is accessible in production.

**Acceptance Criteria**:
- [ ] Pack appears in `GET /v1/packs` endpoint
- [ ] Pack download works for pro tier users
- [ ] Pack returns 402 for free tier users
- [ ] Subscription gating enforced correctly

**Effort**: Small (30 min)

**Dependencies**: T21.1, T21.7

---

#### T21.9: Smoke Test Full User Journey

**Description**: Complete end-to-end testing of the production deployment.

**Acceptance Criteria**:
- [ ] Landing page loads at `https://constructs.network`
- [ ] Login works with credentials
- [ ] Dashboard displays correctly
- [ ] Skills page loads with TUI styling
- [ ] API keys page works
- [ ] Profile page displays user info
- [ ] Navigation keyboard shortcuts work
- [ ] Mobile responsive layout functions

**Effort**: Medium (1 hour)

**Dependencies**: T21.6

---

#### T21.10: Create Production Deployment Documentation

**Description**: Document the production deployment process and monitoring procedures.

**Acceptance Criteria**:
- [ ] Update `docs/SOFT-LAUNCH-OPERATIONS.md` with production URLs
- [ ] Document DNS configuration
- [ ] Document deployment commands
- [ ] Document monitoring endpoints
- [ ] Add troubleshooting section

**Effort**: Small (30 min)

**Dependencies**: T21.9

---

### Sprint 21 Summary

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| T21.1 | Deploy API to Fly.io | S | ⬜ Pending |
| T21.2 | Configure Vercel for Web | S | ⬜ Pending |
| T21.3 | Deploy Web to Vercel | S | ⬜ Pending |
| T21.4 | Custom Domain (Web) | S | ⬜ Pending |
| T21.5 | Custom Domain (API) | S | ⬜ Pending |
| T21.6 | Update Production URLs | S | ⬜ Pending |
| T21.7 | Seed Production Users | S | ⬜ Pending |
| T21.8 | Verify GTM Pack | S | ⬜ Pending |
| T21.9 | Smoke Test | M | ⬜ Pending |
| T21.10 | Documentation | S | ⬜ Pending |

**Total Estimated Effort**: ~6 hours

---

## Sprint 22: Soft Launch Deployment (No Custom Domains)

**Goal**: Deploy to production using auto-generated URLs (Fly.dev and Vercel.app) without custom domain configuration. Allows immediate testing before DNS setup.

**Duration**: 2-3 hours

### Sprint Configuration

| Parameter | Value |
|-----------|-------|
| **API URL** | `https://loa-constructs-api.fly.dev` |
| **Web URL** | `https://loa-constructs.vercel.app` (TBD after deploy) |
| **Database** | Neon PostgreSQL (already configured) |
| **Risk Level** | Low |

### Prerequisites

```bash
# Install Fly CLI (if not installed)
curl -L https://fly.io/install.sh | sh

# Authenticate Fly
fly auth login

# Authenticate Vercel
vercel login
```

### Tasks

---

#### T22.1: Install & Authenticate CLI Tools

**Description**: Ensure Fly and Vercel CLIs are installed and authenticated.

**Acceptance Criteria**:
- [ ] Fly CLI installed (`fly version` works)
- [ ] Fly authenticated (`fly auth whoami` shows user)
- [ ] Vercel CLI installed (`vercel --version` works)
- [ ] Vercel authenticated (`vercel whoami` shows user)

**Effort**: Small (15 min)

**Commands**:
```bash
# Install Fly
curl -L https://fly.io/install.sh | sh
fly auth login

# Vercel (already installed via npm)
vercel login
```

---

#### T22.2: Deploy API to Fly.io

**Description**: Deploy the Hono API to Fly.io using auto-generated URL.

**Acceptance Criteria**:
- [ ] Secrets configured (DATABASE_URL, JWT_SECRET)
- [ ] Deploy completes successfully
- [ ] Health check passes at `https://loa-constructs-api.fly.dev/v1/health`
- [ ] API responds with 200 OK

**Effort**: Small (20 min)

**Dependencies**: T22.1

**Commands**:
```bash
cd apps/api
fly secrets set DATABASE_URL="postgresql://neondb_owner:...@neon.tech/neondb?sslmode=require"
fly secrets set JWT_SECRET="your-production-jwt-secret-minimum-32-chars"
fly deploy
curl https://loa-constructs-api.fly.dev/v1/health
```

---

#### T22.3: Update CORS for Vercel Auto-URL

**Description**: Update API CORS configuration to allow Vercel's auto-generated URL pattern.

**Acceptance Criteria**:
- [ ] CORS allows `*.vercel.app` in production
- [ ] CORS allows `loa-constructs*.vercel.app` pattern
- [ ] Typecheck passes
- [ ] Changes committed

**Effort**: Small (15 min)

**Dependencies**: T22.2

**Files to Modify**:
- `apps/api/src/app.ts`

---

#### T22.4: Deploy Web to Vercel

**Description**: Deploy the Next.js web app to Vercel using CLI.

**Acceptance Criteria**:
- [ ] Environment variable set (NEXT_PUBLIC_API_URL)
- [ ] Deploy to production
- [ ] Site loads at Vercel URL
- [ ] TUI styling renders correctly

**Effort**: Small (20 min)

**Dependencies**: T22.2, T22.3

**Commands**:
```bash
cd apps/web
vercel --prod
# Set env var in Vercel dashboard or:
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://loa-constructs-api.fly.dev
```

---

#### T22.5: Redeploy API with Vercel URL in CORS

**Description**: After getting the Vercel URL, update CORS and redeploy API.

**Acceptance Criteria**:
- [ ] CORS includes exact Vercel URL
- [ ] API redeployed with new CORS
- [ ] Cross-origin requests work from Vercel to Fly

**Effort**: Small (15 min)

**Dependencies**: T22.4

---

#### T22.6: Seed Production Users

**Description**: Create initial THJ team users in production database.

**Acceptance Criteria**:
- [ ] Run seed script with production DATABASE_URL
- [ ] Users created successfully
- [ ] Subscriptions granted

**Effort**: Small (15 min)

**Dependencies**: T22.2

**Commands**:
```bash
DATABASE_URL="postgresql://..." npx tsx scripts/seed-thj-team.ts
```

---

#### T22.7: Smoke Test Full Journey

**Description**: Test the deployed application end-to-end.

**Acceptance Criteria**:
- [ ] Landing page loads
- [ ] Login page renders
- [ ] API health endpoint responds
- [ ] Dashboard loads (if auth works)
- [ ] TUI styling visible
- [ ] Skills page loads

**Effort**: Medium (30 min)

**Dependencies**: T22.5, T22.6

---

### Sprint 22 Summary

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| T22.1 | Install & Auth CLI Tools | S | ✅ Complete |
| T22.2 | Deploy API to Fly.io | S | ✅ Complete |
| T22.3 | Update CORS for Vercel | S | ✅ Complete |
| T22.4 | Deploy Web to Vercel | S | ✅ Complete |
| T22.5 | Redeploy API with CORS | S | ✅ Complete |
| T22.6 | Seed Production Users | S | ✅ Complete |
| T22.7 | Smoke Test | M | ✅ Complete |

**Total Estimated Effort**: ~2.5 hours

---

## Deployment Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Production Architecture                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────┐         ┌─────────────────┐                   │
│   │    Vercel       │         │    Fly.io       │                   │
│   │                 │         │                 │                   │
│   │  constructs.    │ ──────▶ │  api.constructs.│                   │
│   │    network      │  API    │    network      │                   │
│   │                 │ calls   │                 │                   │
│   │  Next.js App    │         │  Hono API       │                   │
│   └─────────────────┘         └────────┬────────┘                   │
│                                        │                            │
│                                        ▼                            │
│                               ┌─────────────────┐                   │
│                               │    Neon         │                   │
│                               │    PostgreSQL   │                   │
│                               └─────────────────┘                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### DNS Configuration

| Record Type | Name | Value |
|-------------|------|-------|
| CNAME | `constructs.network` | `cname.vercel-dns.com` |
| CNAME | `api.constructs.network` | `loa-constructs-api.fly.dev` |

### Environment Variables

**Vercel (Web)**:
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.constructs.network` |

**Fly.io (API)**:
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://...@neon.tech/...` |
| `JWT_SECRET` | `<secret>` |
| `API_URL` | `https://api.constructs.network` |
| `DASHBOARD_URL` | `https://constructs.network` |

---

## Sprint 23: Pack Submission Core

**Goal**: Implement the core pack submission workflow - creators can submit packs for review, admins can approve/reject with feedback, and email notifications are sent.

**Duration**: 1-2 days

**PRD Reference**: `loa-grimoire/prd-pack-submission.md`
**SDD Reference**: `loa-grimoire/sdd-pack-submission.md`

### Sprint Configuration

| Parameter | Value |
|-----------|-------|
| **Feature** | Pack Submission & Creator Program |
| **Phase** | 1 of 3 (Core Submission) |
| **Risk Level** | Medium |
| **Dependencies** | Sprints 18-22 complete |

### Tasks

---

#### T23.1: Add pack_submissions Table to Schema

**Description**: Add the `pack_submissions` table to track submission history and review workflow.

**Acceptance Criteria**:
- [ ] Add `packSubmissionStatusEnum` to `schema.ts`
- [ ] Add `packSubmissions` table with all fields per SDD
- [ ] Add `packSubmissionsRelations` for Drizzle relations
- [ ] Export new table from `db/index.ts`
- [ ] TypeScript compiles without errors

**Effort**: Small (1 hour)

**Dependencies**: None

**Files to Modify**:
- `apps/api/src/db/schema.ts`
- `apps/api/src/db/index.ts`

---

#### T23.2: Create Database Migration

**Description**: Create and run the database migration for new tables.

**Acceptance Criteria**:
- [ ] Create migration file `20260104_pack_submissions.sql`
- [ ] Migration creates `pack_submissions` table
- [ ] Migration creates all required indexes
- [ ] Migration runs successfully against Neon DB
- [ ] Rollback script tested

**Effort**: Small (30 min)

**Dependencies**: T23.1

**Files to Create**:
- `apps/api/drizzle/migrations/20260104_pack_submissions.sql`

**Commands**:
```bash
cd apps/api
npx drizzle-kit generate:pg
npx drizzle-kit push:pg
```

---

#### T23.3: Create Submission Service

**Description**: Create the service layer for pack submissions.

**Acceptance Criteria**:
- [ ] Create `apps/api/src/services/submissions.ts`
- [ ] Implement `createPackSubmission()` function
- [ ] Implement `getLatestPackSubmission()` function
- [ ] Implement `withdrawPackSubmission()` function
- [ ] Implement `updateSubmissionReview()` function
- [ ] Implement `countRecentSubmissions()` for rate limiting
- [ ] Implement `updatePackStatus()` helper
- [ ] All functions have proper error handling
- [ ] TypeScript types exported

**Effort**: Medium (2 hours)

**Dependencies**: T23.2

**Files to Create**:
- `apps/api/src/services/submissions.ts`

---

#### T23.4: Add POST /v1/packs/:slug/submit Endpoint

**Description**: Implement the endpoint for creators to submit packs for review.

**Acceptance Criteria**:
- [ ] Add endpoint to `routes/packs.ts`
- [ ] Validate pack ownership
- [ ] Validate pack state (must be `draft` or `rejected`)
- [ ] Validate pack has at least one version
- [ ] Validate pack has description
- [ ] Enforce rate limit (5 submissions/24h)
- [ ] Create submission record
- [ ] Update pack status to `pending_review`
- [ ] Return submission ID and status
- [ ] Log submission event

**Effort**: Medium (2 hours)

**Dependencies**: T23.3

**Files to Modify**:
- `apps/api/src/routes/packs.ts`

---

#### T23.5: Add POST /v1/packs/:slug/withdraw Endpoint

**Description**: Implement the endpoint for creators to withdraw pending submissions.

**Acceptance Criteria**:
- [ ] Add endpoint to `routes/packs.ts`
- [ ] Validate pack ownership
- [ ] Validate pack status is `pending_review`
- [ ] Update submission record status to `withdrawn`
- [ ] Update pack status to `draft`
- [ ] Return success response
- [ ] Log withdrawal event

**Effort**: Small (1 hour)

**Dependencies**: T23.3

**Files to Modify**:
- `apps/api/src/routes/packs.ts`

---

#### T23.6: Add GET /v1/packs/:slug/review-status Endpoint

**Description**: Implement the endpoint for creators to check submission status.

**Acceptance Criteria**:
- [ ] Add endpoint to `routes/packs.ts`
- [ ] Validate pack ownership
- [ ] Return latest submission status
- [ ] Include review notes if reviewed
- [ ] Include rejection reason if rejected
- [ ] Handle case where no submission exists

**Effort**: Small (1 hour)

**Dependencies**: T23.3

**Files to Modify**:
- `apps/api/src/routes/packs.ts`

---

#### T23.7: Enhance Admin Review Endpoint

**Description**: Add `POST /v1/admin/packs/:id/review` for structured review decisions.

**Acceptance Criteria**:
- [ ] Add new endpoint to `routes/admin.ts`
- [ ] Require `status` (published/rejected) and `review_notes`
- [ ] Require `rejection_reason` when rejecting
- [ ] Update pack status
- [ ] Update submission record with review details
- [ ] Create audit log entry
- [ ] Return success response

**Effort**: Medium (2 hours)

**Dependencies**: T23.3

**Files to Modify**:
- `apps/api/src/routes/admin.ts`

---

#### T23.8: Add GET /v1/admin/reviews Endpoint

**Description**: Add review queue endpoint for admins with enhanced data.

**Acceptance Criteria**:
- [ ] Add endpoint to `routes/admin.ts`
- [ ] Return packs with `pending_review` status
- [ ] Include submission timestamp and notes
- [ ] Include creator email and name
- [ ] Include latest version number
- [ ] Order by submission date (oldest first)

**Effort**: Small (1.5 hours)

**Dependencies**: T23.3

**Files to Modify**:
- `apps/api/src/routes/admin.ts`

---

#### T23.9: Add Pack Submission Email Templates

**Description**: Create email templates for submission workflow notifications.

**Acceptance Criteria**:
- [ ] Add `generatePackSubmittedEmail()` - creator notification
- [ ] Add `generatePackApprovedEmail()` - approval notification
- [ ] Add `generatePackRejectedEmail()` - rejection with feedback
- [ ] Add `generateAdminPackSubmittedEmail()` - admin notification
- [ ] Templates match existing email styling
- [ ] Templates include all required dynamic fields

**Effort**: Medium (2 hours)

**Dependencies**: None

**Files to Modify**:
- `apps/api/src/services/email.ts`

---

#### T23.10: Add Email Sending Functions

**Description**: Create functions to send submission workflow emails.

**Acceptance Criteria**:
- [ ] Add `sendPackSubmissionEmails()` - sends to creator + admins
- [ ] Add `sendPackApprovedEmail()` - sends to creator
- [ ] Add `sendPackRejectedEmail()` - sends to creator
- [ ] Configure admin email address
- [ ] Graceful handling when email not configured

**Effort**: Small (1 hour)

**Dependencies**: T23.9

**Files to Modify**:
- `apps/api/src/services/email.ts`

---

#### T23.11: Integrate Email Notifications

**Description**: Connect email sending to submission and review endpoints.

**Acceptance Criteria**:
- [ ] Submit endpoint sends creator confirmation + admin alert
- [ ] Review endpoint sends approval/rejection email to creator
- [ ] Email errors don't block API responses
- [ ] All emails logged

**Effort**: Small (1 hour)

**Dependencies**: T23.4, T23.7, T23.10

**Files to Modify**:
- `apps/api/src/routes/packs.ts`
- `apps/api/src/routes/admin.ts`

---

#### T23.12: Add Unit Tests for Submission Service

**Description**: Create unit tests for the submission service functions.

**Acceptance Criteria**:
- [ ] Test `createPackSubmission()` creates record
- [ ] Test `getLatestPackSubmission()` returns correct submission
- [ ] Test `withdrawPackSubmission()` updates status
- [ ] Test `countRecentSubmissions()` respects time window
- [ ] All tests pass

**Effort**: Medium (2 hours)

**Dependencies**: T23.3

**Files to Create**:
- `apps/api/tests/unit/submissions.test.ts`

---

#### T23.13: Add Integration Tests for Submission Flow

**Description**: Create end-to-end tests for the submission workflow.

**Acceptance Criteria**:
- [ ] Test submit endpoint with valid pack
- [ ] Test submit rejects non-owner
- [ ] Test submit validates pack state
- [ ] Test withdraw endpoint
- [ ] Test review-status endpoint
- [ ] Test admin review endpoint
- [ ] All tests pass

**Effort**: Medium (2 hours)

**Dependencies**: T23.4, T23.5, T23.6, T23.7

**Files to Create**:
- `apps/api/tests/e2e/pack-submission.test.ts`

---

### Sprint 23 Summary

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| T23.1 | Add pack_submissions schema | S | ⬜ Pending |
| T23.2 | Create database migration | S | ⬜ Pending |
| T23.3 | Create submission service | M | ⬜ Pending |
| T23.4 | POST /submit endpoint | M | ⬜ Pending |
| T23.5 | POST /withdraw endpoint | S | ⬜ Pending |
| T23.6 | GET /review-status endpoint | S | ⬜ Pending |
| T23.7 | Enhance admin review endpoint | M | ⬜ Pending |
| T23.8 | GET /admin/reviews endpoint | S | ⬜ Pending |
| T23.9 | Pack submission email templates | M | ⬜ Pending |
| T23.10 | Email sending functions | S | ⬜ Pending |
| T23.11 | Integrate email notifications | S | ⬜ Pending |
| T23.12 | Unit tests | M | ⬜ Pending |
| T23.13 | Integration tests | M | ⬜ Pending |

**Total Estimated Effort**: ~18 hours

---

## Sprint 24: Creator Dashboard

**Goal**: Implement creator dashboard API endpoints and web UI for pack management.

**Duration**: 1-2 days

### Tasks

---

#### T24.1: Create Creator Service

**Description**: Create service layer for creator dashboard queries.

**Acceptance Criteria**:
- [ ] Create `apps/api/src/services/creator.ts`
- [ ] Implement `getCreatorPacks()` function
- [ ] Implement `getCreatorTotals()` function
- [ ] Return packs with status, downloads, latest version
- [ ] TypeScript types exported

**Effort**: Medium (1.5 hours)

**Dependencies**: T23.2

**Files to Create**:
- `apps/api/src/services/creator.ts`

---

#### T24.2: Create Creator Routes

**Description**: Create the `/v1/creator/*` API routes.

**Acceptance Criteria**:
- [ ] Create `apps/api/src/routes/creator.ts`
- [ ] Apply `requireAuth()` middleware
- [ ] Apply rate limiter
- [ ] Export router

**Effort**: Small (30 min)

**Dependencies**: None

**Files to Create**:
- `apps/api/src/routes/creator.ts`

---

#### T24.3: Add GET /v1/creator/packs Endpoint

**Description**: Implement endpoint to list creator's packs with stats.

**Acceptance Criteria**:
- [ ] List all packs owned by current user
- [ ] Include status, downloads, latest version
- [ ] Include placeholder revenue fields (v1.1)
- [ ] Include totals summary

**Effort**: Small (1 hour)

**Dependencies**: T24.1, T24.2

**Files to Modify**:
- `apps/api/src/routes/creator.ts`

---

#### T24.4: Add GET /v1/creator/earnings Endpoint

**Description**: Implement placeholder earnings endpoint for v1.1.

**Acceptance Criteria**:
- [ ] Return placeholder earnings structure
- [ ] Include `stripe_connect_status: 'not_connected'`
- [ ] Include `payout_schedule: 'manual'`
- [ ] Document v1.1 fields in response

**Effort**: Small (30 min)

**Dependencies**: T24.2

**Files to Modify**:
- `apps/api/src/routes/creator.ts`

---

#### T24.5: Register Creator Routes in App

**Description**: Add creator routes to the main app router.

**Acceptance Criteria**:
- [ ] Import `creatorRouter` in `app.ts`
- [ ] Mount at `/v1/creator`
- [ ] Verify routes respond correctly

**Effort**: Small (15 min)

**Dependencies**: T24.2

**Files to Modify**:
- `apps/api/src/app.ts`

---

#### T24.6: Create Creator Dashboard Page (Web)

**Description**: Create the web UI for creator dashboard at `/creator`.

**Acceptance Criteria**:
- [ ] Create `apps/web/src/app/(dashboard)/creator/page.tsx`
- [ ] List creator's packs with status badges
- [ ] Show downloads count for each pack
- [ ] Show "Submit for Review" button for draft packs
- [ ] Link to pack edit pages
- [ ] TUI styling consistent with rest of app

**Effort**: Medium (3 hours)

**Dependencies**: T24.3

**Files to Create**:
- `apps/web/src/app/(dashboard)/creator/page.tsx`

---

#### T24.7: Create Pack Submission Modal (Web)

**Description**: Create modal for submitting pack for review.

**Acceptance Criteria**:
- [ ] Create submission modal component
- [ ] Include optional notes field
- [ ] Show validation requirements
- [ ] Call `/submit` endpoint on confirm
- [ ] Show success/error feedback
- [ ] TUI styling

**Effort**: Medium (2 hours)

**Dependencies**: T23.4

**Files to Create**:
- `apps/web/src/components/creator/submit-pack-modal.tsx`

---

#### T24.8: Add Review Status Display (Web)

**Description**: Show review status on pack cards in creator dashboard.

**Acceptance Criteria**:
- [ ] Show status badge (Draft, Pending Review, Published, Rejected)
- [ ] Show "View Feedback" link for rejected packs
- [ ] Show reviewer notes in modal/drawer
- [ ] Show "Withdraw" button for pending packs

**Effort**: Medium (2 hours)

**Dependencies**: T24.6

**Files to Modify**:
- `apps/web/src/app/(dashboard)/creator/page.tsx`

---

#### T24.9: Add Creator Link to Dashboard Sidebar

**Description**: Add navigation item for creator dashboard.

**Acceptance Criteria**:
- [ ] Add "Creator" item to sidebar navigation
- [ ] Show only for users with at least one pack
- [ ] Keyboard shortcut assigned

**Effort**: Small (30 min)

**Dependencies**: None

**Files to Modify**:
- `apps/web/src/components/dashboard/sidebar.tsx`

---

#### T24.10: Integration Tests for Creator Endpoints

**Description**: Add tests for creator dashboard endpoints.

**Acceptance Criteria**:
- [ ] Test GET /creator/packs returns user's packs
- [ ] Test GET /creator/packs excludes other users' packs
- [ ] Test GET /creator/earnings returns placeholder data
- [ ] All tests pass

**Effort**: Small (1 hour)

**Dependencies**: T24.3, T24.4

**Files to Create**:
- `apps/api/tests/e2e/creator.test.ts`

---

### Sprint 24 Summary

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| T24.1 | Creator service | M | ⬜ Pending |
| T24.2 | Creator routes file | S | ⬜ Pending |
| T24.3 | GET /creator/packs | S | ⬜ Pending |
| T24.4 | GET /creator/earnings | S | ⬜ Pending |
| T24.5 | Register routes | S | ⬜ Pending |
| T24.6 | Creator dashboard page | M | ⬜ Pending |
| T24.7 | Pack submission modal | M | ⬜ Pending |
| T24.8 | Review status display | M | ⬜ Pending |
| T24.9 | Sidebar navigation | S | ⬜ Pending |
| T24.10 | Integration tests | S | ⬜ Pending |

**Total Estimated Effort**: ~12 hours

---

## Sprint 25: Revenue Sharing Foundation (v1.1)

**Goal**: Lay groundwork for creator revenue sharing - download attribution tracking and Stripe Connect preparation.

**Duration**: 2-3 days

**Note**: This sprint prepares infrastructure but does NOT enable automated payouts. Payouts remain manual via Stripe dashboard until v1.2.

### Tasks

---

#### T25.1: Add Download Attribution Schema

**Description**: Add `pack_download_attributions` table for revenue tracking.

**Acceptance Criteria**:
- [ ] Add table to `schema.ts`
- [ ] Include pack_id, user_id, subscription_id, month, action
- [ ] Add unique constraint on (pack_id, user_id, month)
- [ ] Add relations
- [ ] Create migration

**Effort**: Small (1 hour)

**Dependencies**: None

**Files to Modify**:
- `apps/api/src/db/schema.ts`

---

#### T25.2: Add Creator Payouts Schema

**Description**: Add `creator_payouts` table for payout tracking.

**Acceptance Criteria**:
- [ ] Add table to `schema.ts`
- [ ] Include user_id, amount_cents, period, status, stripe_transfer_id
- [ ] Include breakdown JSONB field
- [ ] Add relations
- [ ] Create migration

**Effort**: Small (1 hour)

**Dependencies**: None

**Files to Modify**:
- `apps/api/src/db/schema.ts`

---

#### T25.3: Add Stripe Connect Fields to Users

**Description**: Add Stripe Connect fields to users table.

**Acceptance Criteria**:
- [ ] Add `stripe_connect_account_id` column
- [ ] Add `stripe_connect_onboarding_complete` boolean
- [ ] Add `payout_threshold_cents` with default 5000
- [ ] Create migration

**Effort**: Small (30 min)

**Dependencies**: None

**Files to Modify**:
- `apps/api/src/db/schema.ts`

---

#### T25.4: Track Download Attributions

**Description**: Record download attributions when packs are downloaded.

**Acceptance Criteria**:
- [ ] Create `trackDownloadAttribution()` function
- [ ] Call from pack download endpoint
- [ ] Calculate month as first of month
- [ ] Handle duplicate prevention (upsert)
- [ ] Only track for premium packs

**Effort**: Medium (2 hours)

**Dependencies**: T25.1

**Files to Modify**:
- `apps/api/src/services/packs.ts`
- `apps/api/src/routes/packs.ts`

---

#### T25.5: Create Stripe Connect Onboarding Endpoint

**Description**: Create endpoint to start Stripe Connect onboarding.

**Acceptance Criteria**:
- [ ] Add `POST /v1/creator/connect-stripe` endpoint
- [ ] Create Stripe Connect account link
- [ ] Return redirect URL for onboarding
- [ ] Store account ID in user record

**Effort**: Medium (2 hours)

**Dependencies**: T25.3

**Files to Create**:
- `apps/api/src/services/stripe-connect.ts`

**Files to Modify**:
- `apps/api/src/routes/creator.ts`

---

#### T25.6: Handle Stripe Connect Webhook

**Description**: Process Stripe Connect account.updated webhook.

**Acceptance Criteria**:
- [ ] Add webhook handler for `account.updated`
- [ ] Update `stripe_connect_onboarding_complete` field
- [ ] Log completion events

**Effort**: Medium (2 hours)

**Dependencies**: T25.5

**Files to Modify**:
- `apps/api/src/routes/webhooks.ts`

---

#### T25.7: Calculate Creator Earnings

**Description**: Create function to calculate earnings from attributions.

**Acceptance Criteria**:
- [ ] Create `calculateCreatorEarnings()` function
- [ ] Query attributions for period
- [ ] Calculate based on download share
- [ ] Apply 70/30 split
- [ ] Return breakdown by pack

**Effort**: Medium (2 hours)

**Dependencies**: T25.4

**Files to Create**:
- `apps/api/src/services/payouts.ts`

---

#### T25.8: Update Earnings Endpoint

**Description**: Connect real data to earnings endpoint.

**Acceptance Criteria**:
- [ ] Call `calculateCreatorEarnings()` for current month
- [ ] Return real download-based earnings
- [ ] Include Stripe Connect status
- [ ] Include payout threshold info

**Effort**: Small (1 hour)

**Dependencies**: T25.7

**Files to Modify**:
- `apps/api/src/routes/creator.ts`

---

#### T25.9: Create Payout Report Script

**Description**: Create admin script to generate monthly payout reports.

**Acceptance Criteria**:
- [ ] Create `scripts/generate-payout-report.ts`
- [ ] Calculate earnings for all creators
- [ ] Output CSV or JSON report
- [ ] Flag creators above threshold
- [ ] Show total payout amount

**Effort**: Medium (2 hours)

**Dependencies**: T25.7

**Files to Create**:
- `scripts/generate-payout-report.ts`

---

#### T25.10: Add Earnings Dashboard UI (Web)

**Description**: Create earnings display in creator dashboard.

**Acceptance Criteria**:
- [ ] Show lifetime earnings
- [ ] Show current month earnings
- [ ] Show Stripe Connect status
- [ ] "Connect Stripe" button for non-connected users
- [ ] Link to Stripe Express dashboard for connected users

**Effort**: Medium (2 hours)

**Dependencies**: T25.8

**Files to Create**:
- `apps/web/src/app/(dashboard)/creator/earnings/page.tsx`

---

### Sprint 25 Summary

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| T25.1 | Download attribution schema | S | ⬜ Pending |
| T25.2 | Creator payouts schema | S | ⬜ Pending |
| T25.3 | Stripe Connect user fields | S | ⬜ Pending |
| T25.4 | Track download attributions | M | ⬜ Pending |
| T25.5 | Stripe Connect onboarding | M | ⬜ Pending |
| T25.6 | Stripe Connect webhook | M | ⬜ Pending |
| T25.7 | Calculate earnings | M | ⬜ Pending |
| T25.8 | Update earnings endpoint | S | ⬜ Pending |
| T25.9 | Payout report script | M | ⬜ Pending |
| T25.10 | Earnings dashboard UI | M | ⬜ Pending |

**Total Estimated Effort**: ~16 hours

---

## Feature Summary: Pack Submission & Creator Program

### Phase Breakdown

| Phase | Sprint | Description | Status |
|-------|--------|-------------|--------|
| 1 | Sprint 23 | Core submission workflow | ⬜ Pending |
| 2 | Sprint 24 | Creator dashboard | ⬜ Pending |
| 3 | Sprint 25 | Revenue sharing foundation | ⬜ Pending |

### Total Effort

| Sprint | Hours |
|--------|-------|
| Sprint 23 | ~18 |
| Sprint 24 | ~12 |
| Sprint 25 | ~16 |
| **Total** | **~46** |

### Dependencies

```
Sprint 23: Core Submission
├── T23.1 Schema ──► T23.2 Migration ──► T23.3 Service
│                                              │
├── T23.9 Templates ──► T23.10 Email Funcs ────┼──► T23.11 Integration
│                                              │
└── T23.3 ──┬──► T23.4 Submit ─────────────────┼──► T23.11
            ├──► T23.5 Withdraw               │
            ├──► T23.6 Review Status          │
            ├──► T23.7 Admin Review ──────────┼──► T23.11
            └──► T23.8 Admin Queue            │
                                              │
                                              ▼
Sprint 24: Creator Dashboard
├── T24.1 Creator Service ──► T24.3 Packs Endpoint
├── T24.2 Routes ──► T24.3 ──► T24.6 Dashboard Page
│           └──► T24.4 Earnings ──► T24.6
│           └──► T24.5 Register
└── T24.6 ──► T24.7 Submit Modal
        └──► T24.8 Status Display
                                              │
                                              ▼
Sprint 25: Revenue Sharing
├── T25.1 Attribution Schema ──► T25.4 Track Downloads
├── T25.2 Payouts Schema
├── T25.3 User Fields ──► T25.5 Connect Onboarding
│                    └──► T25.6 Webhook
└── T25.4 ──► T25.7 Calculate Earnings ──► T25.8 Endpoint
                                      └──► T25.9 Report Script
                                      └──► T25.10 Dashboard UI
```

### Success Criteria

After Sprint 25:
- [ ] Creators can submit packs for review via web UI or API
- [ ] Admins receive email notifications for new submissions
- [ ] Admins can approve/reject with structured feedback
- [ ] Creators receive email notifications for decisions
- [ ] Rejected creators can edit and resubmit
- [ ] Creator dashboard shows all packs with status
- [ ] Download attributions tracked for premium packs
- [ ] Earnings calculated and displayed (manual payouts)
- [ ] Stripe Connect onboarding available

---

**Document Status**: Ready for implementation
**Next Command**: `/implement sprint-23`

---

## Sprint 26: Marketing Website (constructs.network)

**Goal**: Build and deploy the public marketing website for Loa Constructs at constructs.network using the GTM strategy, positioning, and website copy developed in gtm-grimoire.

**Duration**: 2-3 days

**References**:
- GTM Strategy: `gtm-grimoire/NOTES.md`
- Positioning: `gtm-grimoire/strategy/positioning.md`
- Pricing: `gtm-grimoire/strategy/pricing-strategy.md`
- Website Copy: `gtm-grimoire/execution/website-copy-*.md` (19 files)
- Launch Plan: `gtm-grimoire/execution/launch-plan.md`

### Sprint Configuration

| Parameter | Value |
|-----------|-------|
| **Domain** | `constructs.network` |
| **Hosting** | Vercel (existing apps/web deployment) |
| **Tech Stack** | Next.js 14, TUI components, Tailwind CSS |
| **Risk Level** | Low |
| **Prerequisites** | Sprint 18-20 (TUI components complete) |

### Design Principles

Based on GTM strategy:
1. **TUI Aesthetic**: Maintain terminal-style design from dashboard
2. **Developer-First Copy**: Direct, no marketing jargon (per positioning.md)
3. **Demo-Focused**: Show CLI commands, GIFs, code blocks
4. **Conversion Flow**: Free → Browse → Register → Pro upgrade

### Page Structure

```
constructs.network/
├── / (Landing - Hero, Problem, Solution, GTM Collective, Pricing, CTA)
├── /about (Origin story, team, philosophy)
├── /pricing (Detailed tier comparison, FAQ)
├── /packs (Public pack catalog - browse without login)
├── /packs/[slug] (Pack detail - install command, features)
├── /docs (Documentation hub - getting started, CLI)
├── /blog (Launch post, tutorials placeholder)
├── /login (Auth redirect to dashboard)
├── /register (Registration flow)
└── /legal (Terms, Privacy)
```

### Tasks

---

#### T26.1: Create Marketing Layout Component

**Description**: Create a layout component for public marketing pages (distinct from dashboard layout).

**Acceptance Criteria**:
- [ ] Create `apps/web/src/app/(marketing)/layout.tsx`
- [ ] Include header with nav: Home, Packs, Pricing, Docs, Login
- [ ] Include footer with links, copyright, social
- [ ] TUI styling with semi-transparent boxes
- [ ] JWST background visible
- [ ] Mobile responsive hamburger menu

**Effort**: Medium (2 hours)

**Dependencies**: Sprint 18 TUI components

**Files to Create**:
- `apps/web/src/app/(marketing)/layout.tsx`
- `apps/web/src/components/marketing/header.tsx`
- `apps/web/src/components/marketing/footer.tsx`

---

#### T26.2: Redesign Landing Page with GTM Copy

**Description**: Replace current landing page with GTM-approved messaging and copy.

**Acceptance Criteria**:
- [ ] Update `apps/web/src/app/page.tsx` or create `(marketing)/page.tsx`
- [ ] Hero section: "Skill packs for Claude Code. Beyond coding."
- [ ] Subheadline: "Pre-built agent workflows for GTM, documentation, security, and deployment."
- [ ] CLI demo with package manager tabs (npm, pnpm, yarn, bun)
- [ ] Install command: `claude skills add gtm-collective`
- [ ] Problem section: "You're building the prompts instead of the product"
- [ ] Solution section: "Agent skills that just work"
- [ ] Stats section (placeholder: Skills, Downloads, Users)
- [ ] CTA buttons: "Get Started Free", "Browse Packs"
- [ ] Use copy from `website-copy-indie-devs.md`

**Effort**: Large (4 hours)

**Dependencies**: T26.1

**Files to Modify**:
- `apps/web/src/app/page.tsx`

**Reference**: `gtm-grimoire/execution/website-copy-indie-devs.md`

---

#### T26.3: Create GTM Collective Feature Section

**Description**: Add dedicated section showcasing the GTM Collective pack.

**Acceptance Criteria**:
- [ ] Section title: "Go-to-market without leaving your terminal"
- [ ] Description: "8 skills. 14 commands. Everything you need to launch."
- [ ] Commands table showing all GTM commands
- [ ] "Built by founders who shipped 10+ products" credibility
- [ ] CTA: "Try GTM Collective" → /packs/gtm-collective
- [ ] TUI box styling

**Effort**: Medium (2 hours)

**Dependencies**: T26.2

**Files to Modify**:
- `apps/web/src/app/page.tsx` or separate component

---

#### T26.4: Update Pricing Section with Approved Tiers

**Description**: Update landing page pricing preview to match GTM-approved pricing.

**Acceptance Criteria**:
- [ ] Free: $0, "Forever free", public packs, 3 API keys
- [ ] Pro: $29/mo, "For serious builders", all packs, priority support
- [ ] Team: $99/mo, "For growing teams", 5 seats, collaboration
- [ ] Enterprise: $299/mo, "For organizations", SSO, SLA
- [ ] Pro tier highlighted as "Most Popular"
- [ ] Link to full /pricing page
- [ ] Match copy from `website-copy-pricing.md`

**Effort**: Small (1.5 hours)

**Dependencies**: T26.2

**Files to Modify**:
- `apps/web/src/app/page.tsx`

**Reference**: `gtm-grimoire/execution/website-copy-pricing.md`, `gtm-grimoire/strategy/pricing-strategy.md`

---

#### T26.5: Create Dedicated Pricing Page

**Description**: Create full pricing page with comparison table and FAQ.

**Acceptance Criteria**:
- [ ] Create `apps/web/src/app/(marketing)/pricing/page.tsx`
- [ ] Headline: "Simple pricing. No surprises."
- [ ] Full comparison table (features by tier)
- [ ] FAQ section with common questions
- [ ] "Start Free" and "Go Pro" CTAs
- [ ] SEO metadata: "Pricing | Loa Constructs"
- [ ] All copy from `website-copy-pricing.md`

**Effort**: Medium (3 hours)

**Dependencies**: T26.1

**Files to Create**:
- `apps/web/src/app/(marketing)/pricing/page.tsx`

**Reference**: `gtm-grimoire/execution/website-copy-pricing.md`

---

#### T26.6: Create About Page

**Description**: Create about page with origin story and team info.

**Acceptance Criteria**:
- [ ] Create `apps/web/src/app/(marketing)/about/page.tsx`
- [ ] "Why we built this" origin story
- [ ] "What is Loa?" etymology section
- [ ] "Who we are" - The Honey Jar team
- [ ] "What we believe" philosophy
- [ ] "Open source" section with GitHub link
- [ ] Contact section with email, Discord, Twitter
- [ ] SEO metadata
- [ ] All copy from `website-copy-about.md`

**Effort**: Medium (2 hours)

**Dependencies**: T26.1

**Files to Create**:
- `apps/web/src/app/(marketing)/about/page.tsx`

**Reference**: `gtm-grimoire/execution/website-copy-about.md`

---

#### T26.7: Create Public Packs Catalog Page

**Description**: Create public-facing pack catalog (no auth required to browse).

**Acceptance Criteria**:
- [ ] Create `apps/web/src/app/(marketing)/packs/page.tsx`
- [ ] List all published packs
- [ ] Show: name, description, category tag, download count
- [ ] Filter by category (GTM, Security, Docs, etc.)
- [ ] Search functionality
- [ ] "Free" vs "Premium" badges
- [ ] Link to individual pack pages
- [ ] TUI list styling

**Effort**: Medium (3 hours)

**Dependencies**: T26.1

**Files to Create**:
- `apps/web/src/app/(marketing)/packs/page.tsx`

---

#### T26.8: Create Public Pack Detail Page

**Description**: Create individual pack detail page for marketing.

**Acceptance Criteria**:
- [ ] Create `apps/web/src/app/(marketing)/packs/[slug]/page.tsx`
- [ ] Pack name, description, version
- [ ] Install command in copyable code block
- [ ] Commands list with descriptions
- [ ] "Get Started" CTA (→ register if not logged in)
- [ ] Premium badge for paid packs
- [ ] Creator attribution
- [ ] Related packs (future)
- [ ] SEO metadata with pack name

**Effort**: Medium (3 hours)

**Dependencies**: T26.7

**Files to Create**:
- `apps/web/src/app/(marketing)/packs/[slug]/page.tsx`

**Reference**: `gtm-grimoire/execution/website-copy-pack-detail.md`

---

#### T26.9: Create Documentation Hub Page

**Description**: Create docs landing page with getting started guide.

**Acceptance Criteria**:
- [ ] Create `apps/web/src/app/(marketing)/docs/page.tsx`
- [ ] Quick start section with install commands
- [ ] CLI reference links
- [ ] Link to GitHub for full docs
- [ ] Getting started steps (register, install CLI, add pack)
- [ ] TUI styling with code blocks

**Effort**: Medium (2 hours)

**Dependencies**: T26.1

**Files to Create**:
- `apps/web/src/app/(marketing)/docs/page.tsx`

**Reference**: `gtm-grimoire/execution/website-copy-docs.md`

---

#### T26.10: Create Blog Landing Page

**Description**: Create blog index page for launch post and future content.

**Acceptance Criteria**:
- [ ] Create `apps/web/src/app/(marketing)/blog/page.tsx`
- [ ] List blog posts (initially just launch announcement)
- [ ] Post card: title, date, excerpt
- [ ] Link to individual posts
- [ ] TUI styling

**Effort**: Small (1.5 hours)

**Dependencies**: T26.1

**Files to Create**:
- `apps/web/src/app/(marketing)/blog/page.tsx`

---

#### T26.11: Create Launch Announcement Blog Post

**Description**: Create the launch announcement blog post.

**Acceptance Criteria**:
- [ ] Create `apps/web/src/app/(marketing)/blog/launch/page.tsx`
- [ ] Title: "Introducing Loa Constructs: Skill Packs for Claude Code"
- [ ] Content based on launch plan blog outline
- [ ] Problem, solution, GTM Collective demo
- [ ] Pricing overview
- [ ] Call to action
- [ ] Share buttons (Twitter, LinkedIn)
- [ ] SEO metadata

**Effort**: Medium (2 hours)

**Dependencies**: T26.10

**Files to Create**:
- `apps/web/src/app/(marketing)/blog/launch/page.tsx`

**Reference**: `gtm-grimoire/execution/launch-plan.md` (blog post outline)

---

#### T26.12: Create Legal Pages (Terms & Privacy)

**Description**: Create terms of service and privacy policy pages.

**Acceptance Criteria**:
- [ ] Create `apps/web/src/app/(marketing)/terms/page.tsx`
- [ ] Create `apps/web/src/app/(marketing)/privacy/page.tsx`
- [ ] Use copy from `website-copy-legal.md`
- [ ] Plain text styling (not TUI boxes)
- [ ] Last updated date
- [ ] Contact email for questions

**Effort**: Small (1 hour)

**Dependencies**: T26.1

**Files to Create**:
- `apps/web/src/app/(marketing)/terms/page.tsx`
- `apps/web/src/app/(marketing)/privacy/page.tsx`

**Reference**: `gtm-grimoire/execution/website-copy-legal.md`

---

#### T26.13: Add SEO Metadata and Open Graph

**Description**: Configure SEO metadata, Open Graph, and Twitter cards.

**Acceptance Criteria**:
- [ ] Add `metadata` export to all pages
- [ ] Title pattern: "Page | Loa Constructs"
- [ ] Description from positioning.md
- [ ] Open Graph images (1200x630)
- [ ] Twitter card configuration
- [ ] Canonical URLs
- [ ] Sitemap.xml generation
- [ ] Robots.txt

**Effort**: Medium (2 hours)

**Dependencies**: All T26.* pages

**Files to Modify**:
- All marketing pages
- `apps/web/src/app/layout.tsx`

**Files to Create**:
- `apps/web/public/og-image.png`
- `apps/web/src/app/sitemap.ts`
- `apps/web/src/app/robots.ts`

---

#### T26.14: Create Demo GIFs/Videos

**Description**: Create demo assets showing CLI usage.

**Acceptance Criteria**:
- [ ] CLI install GIF (npm install, claude skills add)
- [ ] GTM Collective demo GIF (running /gtm-setup)
- [ ] Optimize for web (<5MB each)
- [ ] Store in `apps/web/public/demos/`
- [ ] Add to landing page hero section

**Effort**: Medium (2 hours)

**Dependencies**: T26.2

**Files to Create**:
- `apps/web/public/demos/cli-install.gif`
- `apps/web/public/demos/gtm-demo.gif`

---

#### T26.15: Add Analytics Integration

**Description**: Add analytics tracking for marketing pages.

**Acceptance Criteria**:
- [ ] Add Plausible or Vercel Analytics
- [ ] Track page views
- [ ] Track CTA button clicks
- [ ] Track registration funnel
- [ ] Configure goals: Register, Pro conversion
- [ ] Privacy-respecting (no cookies if possible)

**Effort**: Small (1 hour)

**Dependencies**: T26.1

**Files to Modify**:
- `apps/web/src/app/layout.tsx`

---

#### T26.16: Mobile Responsive Polish

**Description**: Ensure all marketing pages work well on mobile.

**Acceptance Criteria**:
- [ ] Test all pages on mobile viewport
- [ ] Hero text readable on small screens
- [ ] Navigation hamburger menu works
- [ ] Pricing cards stack properly
- [ ] Code blocks scrollable
- [ ] CTAs full-width on mobile
- [ ] Touch targets adequate (44px)

**Effort**: Medium (2 hours)

**Dependencies**: All T26.* pages

**Files to Modify**:
- Various marketing page components

---

#### T26.17: Configure Custom Domain (constructs.network)

**Description**: Point constructs.network domain to Vercel deployment.

**Acceptance Criteria**:
- [ ] Add domain in Vercel dashboard
- [ ] Configure DNS records at registrar
- [ ] Verify HTTPS certificate issued
- [ ] Test www redirect to apex
- [ ] Verify all pages load correctly
- [ ] Update environment variables if needed

**Effort**: Small (30 min)

**Dependencies**: All T26.* pages complete

---

#### T26.18: Integration Test Marketing Pages

**Description**: Add E2E tests for critical marketing flows.

**Acceptance Criteria**:
- [ ] Test landing page loads
- [ ] Test navigation to all marketing pages
- [ ] Test pricing page displays all tiers
- [ ] Test pack catalog loads
- [ ] Test registration CTA flow
- [ ] Test mobile menu

**Effort**: Medium (2 hours)

**Dependencies**: All T26.* pages

**Files to Create**:
- `apps/web/e2e/marketing.spec.ts`

---

### Sprint 26 Summary

| Task | Description | Effort | Status |
|------|-------------|--------|--------|
| T26.1 | Marketing layout component | M | ⬜ Pending |
| T26.2 | Landing page with GTM copy | L | ⬜ Pending |
| T26.3 | GTM Collective feature section | M | ⬜ Pending |
| T26.4 | Pricing section update | S | ⬜ Pending |
| T26.5 | Dedicated pricing page | M | ⬜ Pending |
| T26.6 | About page | M | ⬜ Pending |
| T26.7 | Public packs catalog | M | ⬜ Pending |
| T26.8 | Pack detail page | M | ⬜ Pending |
| T26.9 | Documentation hub | M | ⬜ Pending |
| T26.10 | Blog landing page | S | ⬜ Pending |
| T26.11 | Launch blog post | M | ⬜ Pending |
| T26.12 | Legal pages | S | ⬜ Pending |
| T26.13 | SEO & Open Graph | M | ⬜ Pending |
| T26.14 | Demo GIFs | M | ⬜ Pending |
| T26.15 | Analytics integration | S | ⬜ Pending |
| T26.16 | Mobile polish | M | ⬜ Pending |
| T26.17 | Custom domain setup | S | ⬜ Pending |
| T26.18 | E2E tests | M | ⬜ Pending |

**Total Estimated Effort**: ~36 hours (3-4 days)

---

### Website Architecture

```
apps/web/src/app/
├── (marketing)/              # Public marketing pages
│   ├── layout.tsx            # Marketing layout (header, footer)
│   ├── page.tsx              # Landing page (moved from root)
│   ├── about/
│   │   └── page.tsx
│   ├── pricing/
│   │   └── page.tsx
│   ├── packs/
│   │   ├── page.tsx          # Pack catalog
│   │   └── [slug]/
│   │       └── page.tsx      # Pack detail
│   ├── docs/
│   │   └── page.tsx
│   ├── blog/
│   │   ├── page.tsx          # Blog index
│   │   └── launch/
│   │       └── page.tsx      # Launch post
│   ├── terms/
│   │   └── page.tsx
│   └── privacy/
│       └── page.tsx
├── (auth)/                   # Auth pages (existing)
│   ├── login/
│   ├── register/
│   └── ...
└── (dashboard)/              # Protected dashboard (existing)
    ├── dashboard/
    ├── skills/
    └── ...
```

### Content Sources (GTM Grimoire)

| Page | Source File |
|------|-------------|
| Landing | `website-copy-indie-devs.md` |
| Pricing | `website-copy-pricing.md` |
| About | `website-copy-about.md` |
| Pack Detail | `website-copy-pack-detail.md` |
| Docs | `website-copy-docs.md` |
| Legal | `website-copy-legal.md` |
| Register | `website-copy-register.md` |
| Emails | `website-copy-emails.md` |

### Key Messaging (from positioning.md)

- **Headline**: "Skill packs for Claude Code. Beyond coding."
- **Tagline**: "The other 50% of shipping products."
- **Value Prop**: "Pre-built agent workflows for GTM, documentation, security, and deployment."
- **Differentiation**: "Workflows, not prompts."
- **Price Anchor**: "$29/mo = less than one hour of consultant time"

### Launch Checklist (Pre-Sprint 26 Completion)

- [ ] All marketing pages deployed
- [ ] Custom domain verified
- [ ] SEO metadata configured
- [ ] Demo GIFs created
- [ ] Analytics tracking
- [ ] Mobile tested
- [ ] E2E tests passing
- [ ] Launch blog post ready

---

**Sprint 26 Status**: Ready for implementation
**Next Command**: `/implement sprint-26`
