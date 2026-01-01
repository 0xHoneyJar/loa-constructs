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
| T22.1 | Install & Auth CLI Tools | S | ⬜ Pending |
| T22.2 | Deploy API to Fly.io | S | ⬜ Pending |
| T22.3 | Update CORS for Vercel | S | ⬜ Pending |
| T22.4 | Deploy Web to Vercel | S | ⬜ Pending |
| T22.5 | Redeploy API with CORS | S | ⬜ Pending |
| T22.6 | Seed Production Users | S | ⬜ Pending |
| T22.7 | Smoke Test | M | ⬜ Pending |

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

**Document Status**: Ready for implementation
**Next Command**: `/implement sprint-21`
