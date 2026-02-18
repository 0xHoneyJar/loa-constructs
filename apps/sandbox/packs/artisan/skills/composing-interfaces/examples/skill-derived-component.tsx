/**
 * SKILL VALIDATION: Component derived purely from composing-interfaces skill
 *
 * Scenario: Build a "Dimension Overview" section for a scoring app
 * with a Nier Automata-inspired aesthetic.
 *
 * Aesthetic DNA Profile:
 * Era: Far-future + Post-collapse
 * Technology: Mechanical + Digital
 * Condition: Weathered
 * Temperature: Warm
 * Weight: Balanced
 * Density: Minimal
 * Movement: Precise + Fluid
 * Mood: Melancholic + Contemplative
 * Formality: Structured
 * Light: Dim
 *
 * Material: Metal (primary) + Screen/Glass (secondary)
 *
 * DERIVATION LOG — which phase drove each decision:
 *
 * Phase 1b (DNA Profile):
 *   - Metal material → sharp corners (border-radius: 0), thin precise borders,
 *     flat single-direction shadows, cool-warm neutrals, uppercase tracked typography
 *   - Weathered condition → subtle noise/texture on panels, muted contrast
 *   - Warm temperature → beige/warm gray palette instead of cold blue-gray
 *   - Dim light → dark backgrounds, low contrast ratios
 *
 * Phase 10 (Material - Visual):
 *   - Metal: border-radius: 0, 1px borders, flat shadows, monospace accents
 *   - Physicalized flat design: faint grid texture overlay on panels
 *   - Symbolic motifs: mechanical dividers, terminal-style accent squares
 *
 * Phase 10 (Material - Behavioral):
 *   - Metal spring: very high stiffness, high damping, low mass
 *   - Hover: precise binary state change (opacity shift, not gradual)
 *   - Transitions: fast (100-200ms), ease-out-expo
 *   - Scroll: discrete, snappy
 *
 * Phase 2 (Hierarchy):
 *   - Hero stat: 6:1+ ratio vs labels (text-4xl vs text-xs = ~4:1 ratio)
 *   - Section title vs body: ~2:1 ratio
 *   - Labels are smallest, tracked-out uppercase
 *
 * Phase 3 (Component Families):
 *   - StatCard and CategoryCard share: same border treatment, same spacing base,
 *     same animation curves, same typography scale
 *   - Variation: StatCard is horizontal (icon + number), CategoryCard is vertical (label + tags)
 *   - ~15% variation — sibling relationship
 *
 * Phase 4 (Spacing):
 *   - Three levels: tight (p-2.5), medium (gap-3), wide (gap-6 between sections)
 *   - Internal padding generous enough to isolate stat numbers
 *
 * Phase 5 (Progressive Disclosure):
 *   - Surface: stat number + label only (2 chunks per card)
 *   - Section title + subtext as advance organizer
 *   - Descriptions hidden — would go behind hover/dialog
 *
 * Phase 6 (Color):
 *   - 95% neutral (warm grays, muted beige)
 *   - Color only on accent squares and left-border indicators
 *   - No colored text anywhere
 *   - Solid colors, not opacity-computed
 *
 * Phase 7 (Focus Items):
 *   - The main "Overall Score" gets unique treatment: larger, shadow effect
 *   - Everything else follows the system
 *
 * Phase 8 (Viewport Budget):
 *   - Category badges: show ~2 rows, collapse after
 *
 * Phase 9 (Content Density):
 *   - Cards: 2 chunks each (number + label)
 *   - No paragraphs on surface
 *
 * Phase 11 (Empty States):
 *   - Icon + short message, matching the material language
 *
 * Phase 12 (Loading):
 *   - Shell rendered immediately, data fills in
 */

import React from "react";

// ============================================================
// DESIGN TOKENS — derived from DNA profile
// ============================================================

// These would normally be CSS custom properties in globals.css.
// Shown inline here for derivation clarity.

const tokens = {
  // Temperature: Warm → beige neutral spectrum (not cold blue-gray)
  colors: {
    bgPrimary: "#1a1816",       // warm dark background
    bgPanel: "#23201d",         // warm panel background
    bgPanelDark: "#1e1b18",     // darker panel variant
    textPrimary: "#d4cfc7",     // warm off-white
    textMuted: "#8a857d",       // warm muted gray
    headerBg: "#2a2723",        // header bar background
    borderMedium: "#3a3632",    // warm medium border
    borderLight: "#2e2b27",     // warm subtle border
    accent: "#c4956a",          // warm muted accent (drab orange, not bright)
  },

  // Material: Metal → precise, fast, no overshoot
  animation: {
    easeOutExpo: "cubic-bezier(0.16, 1, 0.3, 1)",
    durationFast: "150ms",
    durationNormal: "250ms",
  },

  // Formality: Structured → consistent spacing base
  spacing: {
    tight: "10px",    // within components
    medium: "12px",   // between siblings
    wide: "24px",     // between sections
  },

  // Material: Metal → sharp corners, thin borders
  borders: {
    radius: "0px",
    width: "1px",
  },

  // Typography: Metal → uppercase, tracked out
  typography: {
    fontFamily: "'Kanit', sans-serif",  // single font family (Phase 1)
    label: {
      size: "11px",
      weight: 300,
      transform: "uppercase" as const,
      letterSpacing: "0.1em",
    },
    value: {
      size: "28px",     // ~4:1 ratio to label (Phase 2: hierarchy)
      weight: 300,
    },
    sectionTitle: {
      size: "20px",     // ~2:1 ratio to label
      weight: 400,
      transform: "uppercase" as const,
      letterSpacing: "0.15em",
    },
    sectionSubtext: {
      size: "11px",
      weight: 300,
      transform: "uppercase" as const,
      letterSpacing: "0.1em",
    },
  },
};

// ============================================================
// COMPONENTS
// ============================================================

/**
 * AccentSquare — Symbolic motif (Phase 10: suggest through symbolism)
 * Small colored square that acts as a terminal/mechanical indicator.
 * Not a literal icon — a structural element that says "mechanical system"
 */
function AccentSquare({ color }: { color: string }) {
  return (
    <div
      style={{
        width: "10px",
        height: "10px",
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  );
}

/**
 * SectionHeader — Advance organizer (Phase 5)
 * Title + subtext primes comprehension before content appears.
 * Dark header bar matches Metal material (precise, structured).
 */
function SectionHeader({
  title,
  subtext,
  accentColor = tokens.colors.accent,
}: {
  title: string;
  subtext?: string;
  accentColor?: string;
}) {
  return (
    <div
      style={{
        backgroundColor: tokens.colors.headerBg,
        padding: `6px ${tokens.spacing.medium}`,
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      {/* Symbolic accent — not a literal icon (Phase 10: symbolism) */}
      <AccentSquare color={accentColor} />

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: tokens.typography.fontFamily,
            fontSize: tokens.typography.sectionTitle.size,
            fontWeight: tokens.typography.sectionTitle.weight,
            textTransform: tokens.typography.sectionTitle.transform,
            letterSpacing: tokens.typography.sectionTitle.letterSpacing,
            color: tokens.colors.textPrimary,
          }}
        >
          {title}
        </div>
        {subtext && (
          <div
            style={{
              fontFamily: tokens.typography.fontFamily,
              fontSize: tokens.typography.sectionSubtext.size,
              fontWeight: tokens.typography.sectionSubtext.weight,
              textTransform: tokens.typography.sectionSubtext.transform,
              letterSpacing: tokens.typography.sectionSubtext.letterSpacing,
              color: tokens.colors.textMuted,
              marginTop: "2px",
            }}
          >
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * StatCard — Primary data display (Phase 9: 2 chunks per card)
 * Shows: stat number + label. Nothing else on surface.
 * Follows Metal material: sharp corners, thin borders, precise.
 *
 * Component Family: shares DNA with CategoryCard (Phase 3)
 * Same: border treatment, spacing base, animation, typography scale
 * Different: layout direction (horizontal vs vertical), content type
 */
function StatCard({
  label,
  value,
  accentColor = tokens.colors.accent,
}: {
  label: string;
  value: string | number;
  accentColor?: string;
}) {
  return (
    <div
      style={{
        backgroundColor: tokens.colors.bgPanel,
        borderRadius: tokens.borders.radius,   // Metal: sharp corners
        border: `${tokens.borders.width} solid ${tokens.colors.borderMedium}`,
        borderLeft: `2px solid ${accentColor}`, // Accent border — one edge only (Phase 10)
        padding: tokens.spacing.medium,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        // Metal hover: precise binary state change (not gradual)
        transition: `background-color ${tokens.animation.durationFast} ${tokens.animation.easeOutExpo}`,
        cursor: "default",
      }}
    >
      {/* Label — smallest text, tracked out (Phase 2: hierarchy ratio) */}
      <span
        style={{
          fontFamily: tokens.typography.fontFamily,
          fontSize: tokens.typography.label.size,
          fontWeight: tokens.typography.label.weight,
          textTransform: tokens.typography.label.transform,
          letterSpacing: tokens.typography.label.letterSpacing,
          color: tokens.colors.textMuted,
        }}
      >
        {label}
      </span>

      {/* Value — hero treatment, 4:1+ ratio to label (Phase 2) */}
      <span
        style={{
          fontFamily: tokens.typography.fontFamily,
          fontSize: tokens.typography.value.size,
          fontWeight: tokens.typography.value.weight,
          color: tokens.colors.textPrimary,
          // Metal: flat shadow, single direction (not soft spread)
          textShadow: "3px 3px 0 rgba(0,0,0,0.15)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * CategoryCard — Tag display (Phase 3: sibling of StatCard)
 * Same DNA: borders, spacing, animation, typography
 * Different: vertical layout, contains tags instead of a stat number
 * ~15% variation from StatCard — sibling, not clone
 */
function CategoryCard({
  label,
  source,
  tags,
  accentColor = tokens.colors.accent,
}: {
  label: string;
  source: string;
  tags: string[];
  accentColor?: string;
}) {
  return (
    <div
      style={{
        backgroundColor: tokens.colors.bgPanel,
        borderRadius: tokens.borders.radius,   // Same as StatCard (family DNA)
        border: `${tokens.borders.width} solid ${tokens.colors.borderMedium}`,
        padding: tokens.spacing.medium,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        transition: `background-color ${tokens.animation.durationFast} ${tokens.animation.easeOutExpo}`,
      }}
    >
      <div>
        {/* Category label */}
        <div
          style={{
            fontFamily: tokens.typography.fontFamily,
            fontSize: "13px",
            fontWeight: 300,
            color: tokens.colors.textPrimary,
            marginBottom: "4px",
          }}
        >
          {label}
        </div>
        {/* Source — muted, smallest */}
        <div
          style={{
            fontFamily: tokens.typography.fontFamily,
            fontSize: "10px",
            fontWeight: 300,
            color: tokens.colors.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {source}
        </div>
      </div>

      {/* Tags — separated by border (Gestalt: proximity grouping) */}
      <div
        style={{
          borderTop: `${tokens.borders.width} solid ${tokens.colors.borderLight}`,
          paddingTop: "8px",
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
        }}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              fontFamily: tokens.typography.fontFamily,
              fontSize: "10px",
              fontWeight: 400,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: tokens.colors.textPrimary,
              backgroundColor: tokens.colors.bgPanelDark,
              borderLeft: `2px solid ${accentColor}`,
              padding: "3px 8px",
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * EmptyState — Phase 11: icon + short message, nothing more
 * Matches Metal material language (sharp, minimal, no decoration)
 */
function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        color: tokens.colors.textMuted,
      }}
    >
      {/* Placeholder for icon — would be a Phosphor icon in production */}
      <div
        style={{
          width: "24px",
          height: "24px",
          border: `1px solid ${tokens.colors.textMuted}`,
          borderRadius: "0px", // Metal: sharp
        }}
      />
      <span
        style={{
          fontFamily: tokens.typography.fontFamily,
          fontSize: "12px",
          fontWeight: 300,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {message}
      </span>
    </div>
  );
}

/**
 * OverallScore — Focus item (Phase 7: Von Restorff)
 * Gets unique treatment because it's the single most important metric.
 * Unique shadow effect not used by any other component.
 * Still within the material language — just slightly differentiated.
 */
function OverallScore({ score }: { score: number }) {
  return (
    <div
      style={{
        backgroundColor: tokens.colors.bgPanel,
        border: `${tokens.borders.width} solid ${tokens.colors.borderMedium}`,
        borderRadius: tokens.borders.radius,
        padding: "20px 24px",
        display: "flex",
        alignItems: "baseline",
        gap: "12px",
      }}
    >
      {/* Score number — largest element on the page, hero treatment */}
      <span
        style={{
          fontFamily: tokens.typography.fontFamily,
          fontSize: "48px",    // 6:1+ ratio to labels (Phase 2: hero)
          fontWeight: 300,
          color: tokens.colors.textPrimary,
          // Unique shadow — focus item differentiation (Phase 7)
          // Heavier than StatCard shadow — this is the ONE unique treatment
          textShadow: "6px 6px 0 rgba(0,0,0,0.12)",
        }}
      >
        {score}
      </span>
      <span
        style={{
          fontFamily: tokens.typography.fontFamily,
          fontSize: tokens.typography.label.size,
          fontWeight: tokens.typography.label.weight,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: tokens.colors.textMuted,
        }}
      >
        Overall Score
      </span>
    </div>
  );
}

// ============================================================
// COMPOSED SECTION — all phases working together
// ============================================================

/**
 * DimensionOverview — A complete section composed from skill principles
 *
 * Structure follows Phase 1 (big-to-small):
 * 1. Section container (bg panel)
 * 2. SectionHeader (advance organizer — Phase 5)
 * 3. Content grid (stat cards)
 * 4. Subcontent grid (category cards)
 *
 * Spacing follows Phase 4:
 * - Tight: within cards (10-12px)
 * - Medium: between cards (12px gap)
 * - Wide: between sections (24px gap)
 */
export function DimensionOverview() {
  return (
    <div
      style={{
        fontFamily: tokens.typography.fontFamily,
        backgroundColor: tokens.colors.bgPrimary,
        color: tokens.colors.textPrimary,
        padding: tokens.spacing.wide,
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacing.wide,    // Wide gap between major sections
      }}
    >
      {/* FOCUS ITEM: Overall Score (Phase 7: Von Restorff) */}
      <OverallScore score={847} />

      {/* SECTION 1: Dimension Stats */}
      <div
        style={{
          backgroundColor: `${tokens.colors.bgPanel}66`,  // 40% opacity panel
          border: `${tokens.borders.width} solid ${tokens.colors.borderLight}`,
        }}
      >
        {/* Advance organizer (Phase 5): title + subtext */}
        <SectionHeader
          title="Dimensions"
          subtext="Your scoring breakdown across each dimension of the ecosystem"
        />

        {/* Content grid — Phase 8: showing one row of stats */}
        <div
          style={{
            padding: tokens.spacing.medium,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: tokens.spacing.medium,
          }}
        >
          {/* Each card: 2 chunks (Phase 9: stat + label) */}
          <StatCard label="Governance" value={92} />
          <StatCard label="Community" value={78} />
          <StatCard label="Trading" value={85} />
          <StatCard label="Staking" value={71} />
        </div>
      </div>

      {/* SECTION 2: Categories & Badges */}
      <div
        style={{
          backgroundColor: `${tokens.colors.bgPanel}66`,
          border: `${tokens.borders.width} solid ${tokens.colors.borderLight}`,
        }}
      >
        <SectionHeader
          title="Categories & Badges"
          subtext="Earned recognition across participation realms"
        />

        {/* Content grid — Phase 8: ~2 rows then collapse */}
        <div
          style={{
            padding: tokens.spacing.medium,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: tokens.spacing.medium,
          }}
        >
          {/* Sibling components to StatCard (Phase 3: ~15% variation) */}
          <CategoryCard
            label="Liquidity Provider"
            source="Infrared"
            tags={["BGT Staker", "LP Veteran"]}
          />
          <CategoryCard
            label="Governance Voter"
            source="Station"
            tags={["Proposal Author", "Active Voter"]}
          />
          <CategoryCard
            label="NFT Collector"
            source="Bera Market"
            tags={["Early Minter", "Collection Builder"]}
          />
          <CategoryCard
            label="Bridge User"
            source="LayerZero"
            tags={["Cross-chain", "Volume Trader"]}
          />
        </div>
      </div>

      {/* Empty state example (Phase 11) */}
      <div
        style={{
          backgroundColor: `${tokens.colors.bgPanel}66`,
          border: `${tokens.borders.width} solid ${tokens.colors.borderLight}`,
        }}
      >
        <SectionHeader title="Recent Activity" />
        <EmptyState message="No actions recorded yet" />
      </div>
    </div>
  );
}
