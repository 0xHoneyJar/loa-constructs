# dsaints.com — Frontend Craft & Interface Engineering Cluster

> Research dig session — 2026-03-24
> Source: dsaints.com curated directory (666 high-craft design professionals)
> Cluster: FRONTEND CRAFT & INTERFACE ENGINEERING
> Method: WebSearch deep research (dig-search unavailable — missing GEMINI_API_KEY)

---

## 1. Emil Kowalski

**Role**: Design Engineer at Linear (ex-Vercel). Creator of Sonner, Vaul, svgl.

### Philosophy
- Restraint, speed, and purposeful motion — best suited for productivity tools
- Unseen details compound into exceptional user experiences
- Animation is a design material, not decoration
- "You'll learn how to choose the right easing and timing, how to develop taste"

### Animation Decision Framework
- Scale+opacity (never scale-from-zero)
- Ease-out for entrances
- Transform-origin from trigger for popovers
- Active-state press feedback
- CSS transitions vs WAAPI vs JS-driven: choose based on interruptibility needs

### Course: animations.dev
Three modules:
1. **Making it Feel Right** — animation theory, custom easings, perception of speed, spring animations, purpose of animation
2. **How I Use Framer Motion** — practical implementation
3. **The Big Little Details** — walkthroughs of production animations

### Key Techniques
- Spring animations as the default mental model for natural motion
- Interruptible animations (CSS keyframes aren't — they jump on quick additions)
- Tab-visibility awareness: pause timers when document is hidden (Sonner's `useIsDocumentHidden`)
- Observer Pattern for state management (avoid React Context for cross-component toast state)
- Documentation as product: interactive examples lower adoption barriers

### Libraries
- **Sonner**: 13M+ weekly downloads. Stacking animation is what made people fall in love — "it just felt right"
- **Vaul**: Drawer component for mobile
- **svgl**: Curated SVG logo library

---

## 2. Rauno Freiberg

**Role**: Staff Design Engineer at Vercel. Ex-Browser Company (Arc). Estonian.

### Philosophy
- "A designer whose medium is code"
- "Creating software that makes people feel something"
- "Quality is not a result of scale or resources — quality is a function of patience and focus"
- Small teams with autonomous high-performers produce highest quality
- "Understanding why something feels right does not come as intuitively as designing something to feel right — but they are two sides of the same coin"

### Web Interface Guidelines (interfaces.rauno.me)
A living document of details that make a good web interface:
- Inputs wrapped with `<form>` to submit by pressing Enter
- Interactive elements should disable `user-select` for inner content
- Frequent, low-novelty actions should avoid extraneous animations
- Toggles should immediately take effect (no confirmation)
- No dead areas between interactive elements in lists (increase padding instead)
- Gradient text should unset gradient on `::selection`

### Invisible Details of Interaction Design (essay)
- Great interaction design rewards learning by reusing metaphors
- iOS: only gesture explicitly taught is swipe-up to open — unlocks control everywhere
- Swiping horizontally = books for thousands of years
- Mouse/keyboard interactions can skip animation without feeling jarring (peripheral disconnect)
- Frequency vs novelty hypothesis: more common an action, less rewarding novel treatments become

### Key Work
- **cmdk**: Command menu component, millions of downloads/week
- **Devouring Details**: 20 chapters, 20 downloadable React components — Principles, Prototypes, Resources
- Arc browser design and interaction engineering

### Advice
- "Build, build, build"
- For inspiration: "time travel backwards in the industry, or even away from it"

---

## 3. Paco Coursey

**Role**: Webmaster at Linear (ex-Vercel). Creator of cmdk.

### Philosophy
- "Developing skill through doing"
- "Guiltlessly exploring passion and interests"
- Headless, composable, performant, accessible by default
- Clear scope boundaries: cmdk doesn't handle focus trapping — it's agnostic about presentation

### cmdk Design Principles
- Written in 2019 to test if composable combobox API was possible
- Rewritten in 2022 with simpler, more performant approach
- Mental model: `Command` root manages state, `Command.Input` drives search, `Command.List` renders results
- Filter logic built-in, overridable with custom scoring
- Styling via `data-attribute` (starting with `cmdk-`)
- Height animatable via `--cmdk-list-height` CSS variable
- Zero CSS opinions shipped — complete styling freedom

### Key Insight
Command palettes work because "they match how our brains work: we know what we want to do, we just need the computer to keep up."

### Ecosystem
- Powers Linear, Raycast, and many developer tools
- shadcn/ui `Command` component is cmdk with Tailwind pre-applied

---

## 4. Shu Ding

**Role**: Design Engineer at Vercel. BSc Computer Science (Fudan University, 2017). Based in Berlin.

### Philosophy
- "Be curious. Read widely. Try new things." (Aaron Swartz)
- Interests span web development, creative coding, game design, and HCI
- Graphic designer AND software engineer — rare hybrid
- Generative art alongside systems engineering

### Key Projects
- **SWR**: First hook-based stale-while-revalidate data fetching library (2019, co-created with Guillermo Rauch). Led development for 5 years.
- **Satori**: First CSS-to-SVG render engine without browser environment. Standard for OG image generation across Next.js, Nuxt, SvelteKit, Astro.
- **Nextra**: Documentation framework

### Design Engineering Pattern
- Creative coding as generative input for design decisions
- Algorithm challenges as craft practice
- Bridge between systems engineering and visual expression

---

## 5. Evil Rabbit (Nicolás Garro)

**Role**: Founding Designer and Brand Architect at Vercel. From Buenos Aires, based in SF.

### Vercel Design Engineering Philosophy (Team-Level)
1. **Multidisciplinary approach** — wide array of skills, constant experimentation
2. **Beyond visual appeal** — a lot of work behind the pretty pixels
3. **Skip traditional handoff** — designer sketches start, iterates with design engineer in Figma or code
4. **Collaboration across company** — branding, marketing, product, design system
5. **Design-led projects** — autonomy to work on things deprioritized in engineering backlogs
6. **Quality over quantity** — "Iterate to Greatness" principle
7. **Outcome over process** — care about result, not tool
8. **Prototyping in code** — animations, keyboard controls, touch are better implemented in code

### Notable Team Output
- **Geist font** — with interactive playground
- **Design system documentation** — interactive docs playground
- **Dashboard delighters** — features that bring it to life

---

## 6. shadcn (creator of shadcn/ui)

### Philosophy: "Copy, Don't Install"
- NOT a traditional component library — components copied into your project
- No "shadcn-ui" in package.json — no breaking changes from library updates
- Components become part of your internal design system
- Ownership-first: you own the code, control styling, customize everything

### Architecture
- Built on Radix UI primitives (behavior without styling)
- Styled with Tailwind CSS
- Clear separation: Radix = logic/accessibility, shadcn = opinionated styling, you = final implementation

### Design Principles
- **Composition over complexity** — simple, composable building blocks
- **Accessibility inherited** — WAI-ARIA from Radix
- **Full styling power** — Tailwind at your fingertips
- TypeScript, dark mode, powerful CLI, integrates with Next.js, React Hook Form, Zod

### Key Insight
"It respects your expertise as a developer and gives you the tools to build with confidence."

The shift from rigid, top-down to flexible, bottom-up is what makes it powerful.

---

## 7. Timo Lins

**Role**: Designer-developer. Creator of react-hot-toast. Associated with Liveblocks.

### Philosophy
- Lightweight, beautiful by default, easy to customize
- Built react-hot-toast because existing toast libraries were "either not animated, hard to style, or unnecessarily big"
- Designs and codes (order may vary)
- Passions: illustration, filmmaking alongside digital products

### react-hot-toast Design
- Animated checkmark for success, animated error icon for errors
- Exit animations on dismiss (not instant removal)
- Styling allows render function override with animation state
- API design so good it inspired Sonner's approach

### Liveblocks Connection
- Collaboration layer for products — realtime backend + ready-made features
- Figma design kit matches coded React components perfectly
- Philosophy: turn static designs into interactive prototypes before committing engineering time

---

## 8. Pedro Duarte

**Role**: Key contributor to Radix UI Primitives. Design systems engineering.

### Philosophy
- Accessibility at the primitive level, styling in the hands of the design system author
- "Lost count of how many times I'd been asked to build dialogs, tooltips, dropdown menus from scratch — they were all flawed and lacked accessibility"
- Previous styling approaches (CSS, Sass, BEM, styled-components, emotion) "never felt quite right"

### Radix Primitives Design Principles
- **Accessible by default** — WAI-ARIA design patterns, focus management, keyboard navigation
- **Unstyled** — zero visual opinions
- **Open architecture** — granular access to each component part
- **Composable** — wrap parts, add event listeners, props, refs
- Low-level enough for custom APIs, high-level enough for intuitive experience
- Uncontrolled by default, controllable when needed

### Key Insight on Radix
"Radix's brilliance wasn't in how much it gave, but in how much it withheld."

By refusing to style anything, it forced teams to think more deeply about the structure beneath their design systems.

### Stitches + Radix Pattern
- Theme → scales → tokens = constraint-based design
- CSS animation for mount AND unmount (Radix suspends unmount while animation plays)
- Variant API for animation types (fade, scale, etc.)

---

## 9. Gavin Nelson

**Role**: Designer at Linear (ex-GitHub). Icon designer. Based in interface craft.

### Philosophy
- "Ideas over opinions"
- "Prototypes are the most valuable tool for collaboration"
- "Explore a hundred ideas to find the right one"
- Intersection of form and function — experiences that "effortlessly become an extension of oneself"
- Driven by curiosity, strives for high craftsmanship and excellence

### Design Origins
- MacThemes Forum in high school → fascinated by app icon design
- College: HCI — courses in design, psychology, computer science
- Multidisciplinary approach: connect beautiful visuals with complex problem-solving

### Icon Design Craft
- Moderate return of skeuomorphism is a good thing
- Functional utility of skeuomorphism: communicating affordances and z-axis hierarchy
- 3D design basics transformed his icon composition (perspective, lighting reference)
- Most final icons still rendered in vector, but 3D reference is the key

### Interface Craft Appreciation
- Apple Pencil instant Quick Note on locked iPad
- AirPods pausing when removed, Apple Watch silencing when covered
- These invisible details = the standard of craft

---

## 10. Logan Liffick

**Role**: Design Engineer at Vercel (ex-Outerbase, DigitalOcean, Makelog).

### Philosophy
- "A connoisseur of well-crafted digital experiences"
- "Design isn't your ability to master Auto Layout. It's your ability to make something make sense — to users, to businesses, to actual people."
- Learned front-end "out of spite" — frustrated when handoffs to engineers didn't match his designs
- Concept of "invisible brands" — what exists between visuals, engineering, and experience

### Process
1. Start on paper — freedom to explore, avoid "the expected"
2. Avoid inspiration sites (Dribbble, Pinterest) in early phases
3. Anchor back to reality — write everything in semantic HTML
4. High-fidelity + technical experiments in unison (layout in-browser + specific interactions)
5. Iterate with stakeholders

### Key Insight
Best advice received: "Get off Dribbble" — derives inspiration from books, games, film instead.

Works at the crux of product, engineering, and brand — ensuring the three work together harmoniously.

---

## Cross-Cutting Themes

### 1. The Primitives Pattern
Radix (Pedro Duarte) → shadcn (styling layer) → cmdk (Paco/Rauno) → application
Behavior separated from styling. Accessibility at the base. Composition upward.

### 2. Animation as Material
- Emil: spring physics, interruptibility, perception of speed
- Rauno: frequency vs novelty — common actions need less motion
- Timo: beautiful defaults, graceful exit animations
- Pedro: mount/unmount animation support at primitive level

### 3. Headless + Opinionated = Ecosystem
- Radix (headless) + shadcn (opinionated styling) = most adopted pattern
- cmdk (headless) + shadcn Command (styled) = same pattern at component level
- react-hot-toast (opinionated defaults) → Sonner (evolved defaults) = beautiful-by-default path

### 4. Code IS the Design Tool
- Rauno: "a designer whose medium is code"
- Evil Rabbit/Vercel: animations, keyboard controls, touch better prototyped in code
- Logan: learned front-end to close the design-engineering gap
- Shu Ding: creative coding as generative design input

### 5. Feel Through Restraint
- Emil: "restraint, speed, and purposeful motion"
- Rauno: frequent actions should avoid extraneous animations
- shadcn: composition over complexity
- Radix: brilliance in what it withheld

### 6. Quality = Patience × Focus (Not Scale × Resources)
- Rauno: small teams, autonomous high-performers, aligned on taste
- Evil Rabbit/Vercel: quality over quantity, iterate to greatness
- Gavin: explore a hundred ideas to find the right one

### 7. Ownership Over Dependency
- shadcn: copy, don't install — you own the code
- Radix: re-export with your own API
- cmdk: headless, style it yourself
- Common thread: give developers the primitives, not the opinions

---

## Implications for Artisan Construct (Warmth, Weight, Rhythm)

### Warmth
- Not decoration — emotional resonance through purposeful motion (Emil's "making it feel right")
- Skeuomorphic affordances communicate warmth through material familiarity (Gavin)
- Beautiful defaults that respect the user (Timo's react-hot-toast, Emil's Sonner)
- "Creating software that makes people feel something" (Rauno)

### Weight
- Spring physics as the primary motion model — objects have mass (Emil)
- Transform-origin from trigger gives spatial weight to interactions (Emil)
- Z-axis hierarchy communicates visual weight (Gavin)
- Constraint-based design tokens create typographic and spatial weight systems (Pedro/Stitches)
- "Invisible brands" — weight exists between visuals, engineering, and experience (Logan)

### Rhythm
- Frequency-novelty relationship: rhythm determines animation intensity (Rauno)
- Toast lifecycles have arcs and beats: appear → stack → hover-pause → dismiss (Emil/Timo)
- Mount/unmount cadence creates interaction rhythm (Pedro/Radix)
- "Get off Dribbble" — rhythm comes from outside the craft: books, games, film (Logan)
- Pull-to-refresh has rhythm: stretch → spring → spin → tick

### Direct Principles
1. **Spring, don't ease** — spring physics as default for all motion
2. **Restrain the frequent** — high-frequency actions get less animation, not more
3. **Own the code** — copy-paste primitives, never black-box dependencies
4. **Animate mount AND unmount** — incomplete lifecycle destroys rhythm
5. **Prototype in code** — Figma is for sketching, code is the real design tool
6. **Beautiful defaults, full escape hatch** — opinionated starting point, zero styling lock-in
7. **Accessibility at the primitive** — never bolt on, always build in
8. **Document interactively** — let people touch before they adopt
9. **Tab-awareness** — respect the user's attention state (hidden tabs, reduced motion)
10. **Explore a hundred, ship one** — quality requires excessive exploration before restraint
