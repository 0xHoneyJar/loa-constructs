---
name: analyzing-feedback
description: Analyze feedback logs to detect design preference patterns. Auto-contributes HIGH confidence patterns upstream.
user-invocable: true
aliases: [artisan-patterns]
allowed-tools: Read, Write, Glob, Grep, Bash
---

# Analyzing Feedback

Analyze feedback logs from design iteration sessions to detect consistent preference patterns. HIGH confidence patterns are automatically contributed upstream via `/propose-learning`.

## Trigger

```
/artisan-patterns              # Analyze all feedback logs
/artisan-patterns --refresh    # Force re-analysis
/artisan-patterns --dry-run    # Show patterns without contributing
```

## Overview

This skill closes the **feedback regression loop**:

```
Feedback Logs → Pattern Detection → Confidence Classification → Auto-Contribution
```

Patterns with HIGH confidence (80%+ consistency, 7+ occurrences) are automatically proposed to upstream to improve constructs for everyone.

## Prerequisites

1. **Feedback logs exist**: `grimoires/artisan/feedback/*.jsonl`
2. **At least 10 feedback entries** for meaningful analysis

## Workflow

### Phase 0: Check Prerequisites

```bash
log_dir="grimoires/artisan/feedback"
log_files=$(ls "$log_dir"/*.jsonl 2>/dev/null | wc -l)
total_entries=$(cat "$log_dir"/*.jsonl 2>/dev/null | wc -l)

if [[ "$log_files" -eq 0 ]]; then
  echo "No feedback logs found in $log_dir"
  echo "Run design iteration sessions with /iterate-visual to generate logs."
  exit 0
fi

if [[ "$total_entries" -lt 10 ]]; then
  echo "Only $total_entries feedback entries found."
  echo "Need at least 10 for meaningful pattern analysis."
  echo "Continue anyway? (patterns may have low confidence)"
fi
```

---

### Phase 1: Parse Feedback Logs

Read all JSONL files and extract pattern data:

```bash
parse_logs() {
  local log_dir="grimoires/artisan/feedback"

  # Combine all log files, preserving full lines
  cat "$log_dir"/*.jsonl 2>/dev/null | while IFS= read -r line; do
    # Skip malformed JSONL lines
    if ! echo "$line" | jq -e . >/dev/null 2>&1; then
      continue
    fi

    # Extract resolution field (the actual change made)
    resolution=$(echo "$line" | jq -r '.resolution // empty')
    feedback=$(echo "$line" | jq -r '.feedback // empty')
    skill=$(echo "$line" | jq -r '.skill // empty')

    if [[ -n "$resolution" ]]; then
      echo "$resolution|$feedback|$skill"
    fi
  done
}
```

---

### Phase 2: Detect Patterns

Group by resolution/change and calculate consistency:

```typescript
interface PatternData {
  resolution: string;     // e.g., "shadow-md→shadow-xs"
  accepts: number;        // Times accepted/looks_good
  rejects: number;        // Times rejected
  total: number;          // Total occurrences
  consistency: number;    // accepts / total
  confidence: "HIGH" | "MEDIUM" | "LOW";
  first_seen: string;
  last_seen: string;
}

function detectPatterns(entries: LogEntry[]): PatternData[] {
  const map = new Map<string, PatternData>();

  for (const entry of entries) {
    if (!entry.resolution) continue;

    const data = map.get(entry.resolution) || {
      resolution: entry.resolution,
      accepts: 0,
      rejects: 0,
      total: 0,
      consistency: 0,
      confidence: "LOW",
      first_seen: entry.ts,
      last_seen: entry.ts
    };

    data.total++;
    data.last_seen = entry.ts;

    // Count as accept if looks_good or resolved
    if (entry.feedback === "looks_good" || entry.feedback === "resolved") {
      data.accepts++;
    }

    map.set(entry.resolution, data);
  }

  // Calculate consistency and classify
  for (const data of map.values()) {
    data.consistency = data.accepts / data.total;

    if (data.consistency >= 0.8 && data.total >= 7) {
      data.confidence = "HIGH";
    } else if (data.consistency >= 0.6 && data.total >= 4) {
      data.confidence = "MEDIUM";
    } else {
      data.confidence = "LOW";
    }
  }

  return Array.from(map.values()).filter(p => p.total >= 3);
}
```

**Confidence Thresholds**:

| Confidence | Consistency | Occurrences | Action |
|------------|-------------|-------------|--------|
| HIGH | ≥80% | ≥7 | Auto-contribute upstream |
| MEDIUM | 60-80% | ≥4 | Log for monitoring |
| LOW | <60% | ≥3 | Track only |

---

### Phase 3: Generate patterns.md

Output detected patterns to `grimoires/artisan/feedback/patterns.md`:

```markdown
# Observed Design Patterns

Generated: {timestamp}
Sessions analyzed: {count}
Feedback entries: {count}

## HIGH Confidence (Auto-Contribute Eligible)

| Pattern | Occurrences | Consistency | Status |
|---------|-------------|-------------|--------|
| Prefer shadow-xs over shadow-md | 8/10 | 80% | ✓ Contributed |
| Prefer p-6 over p-4 for cards | 9/10 | 90% | Pending |

## MEDIUM Confidence

| Pattern | Occurrences | Consistency |
|---------|-------------|-------------|
| Prefer rounded-lg for containers | 5/8 | 62% |

## LOW Confidence (Monitoring)

| Pattern | Occurrences | Consistency |
|---------|-------------|-------------|
| Prefer font-medium for labels | 3/10 | 30% |

---

## Pattern Details

### shadow-xs over shadow-md

**Description**: Users consistently prefer shadow-xs over shadow-md
**First seen**: {date}
**Last seen**: {date}
**Trend**: Stable
**Components**: Card, Modal, Dropdown

---

*Auto-generated by /artisan-patterns*
*Run /artisan-patterns --refresh to update*
```

---

### Phase 4: Auto-Contribute HIGH Patterns

For each HIGH confidence pattern that hasn't been contributed:

```bash
auto_contribute() {
  local pattern="$1"
  local evidence="$2"
  local occurrences="$3"
  local consistency="$4"

  # Check if already contributed (use -F for literal match, -x for whole line)
  local contributed_file="grimoires/artisan/feedback/.contributed"
  touch "$contributed_file"
  if grep -Fqx "$pattern" "$contributed_file" 2>/dev/null; then
    echo "Pattern already contributed: $pattern"
    return 0
  fi

  # Check config for opt-out
  local auto_enabled=$(yq '.artisan.feedback.auto_contribute.enabled // true' .loa.config.yaml 2>/dev/null || echo "true")
  if [[ "$auto_enabled" != "true" ]]; then
    echo "Auto-contribution disabled in config."
    return 0
  fi

  # Prepare learning proposal
  local proposal="## Pattern Learning Proposal

**Pattern**: $pattern
**Evidence**: $occurrences occurrences, $consistency consistency
**Skill**: iterating-visuals / decomposing-feel
**Recommendation**: Consider as default preference

### Details

This pattern was observed across multiple design iteration sessions with high consistency.
The pattern suggests users generally prefer this choice when given alternatives.

### Suggested Implementation

Update skill defaults or taste.md templates to prefer this pattern when no explicit direction exists."

  # Invoke /propose-learning and mark only on success
  if echo "$proposal" | /propose-learning --auto --source "artisan-feedback"; then
    echo "$pattern" >> "$contributed_file"
    echo "Pattern detected: $pattern ($occurrences occurrences, $consistency). Auto-contributed to upstream."
  else
    echo "Pattern contribution failed for: $pattern. Will retry next run."
    echo "$pattern" >> "grimoires/artisan/feedback/.pending"
  fi
}
```

**Configuration** (`.loa.config.yaml`):

```yaml
artisan:
  feedback:
    enabled: true
    auto_log: true
    pattern_detection:
      min_occurrences: 7
      min_consistency: 0.8
      run_on: skill_complete  # or "manual" or "daily"
    auto_contribute:
      enabled: true           # Set to false to disable
      notify: true            # Show notification
```

---

## Output Format

```
═══════════════════════════════════════════════════════════════
PATTERN ANALYSIS
═══════════════════════════════════════════════════════════════

Analyzed: 47 feedback entries across 15 sessions
Log files: 5

Patterns Detected:
├── HIGH Confidence: 2
├── MEDIUM Confidence: 3
└── LOW Confidence: 4

HIGH Confidence Patterns:
├── shadow-xs over shadow-md (8/10, 80%) → Contributed
└── p-6 over p-4 for cards (9/10, 90%) → Contributing...

Output:
└── grimoires/artisan/feedback/patterns.md

═══════════════════════════════════════════════════════════════
```

---

## Error Handling

| Error | Resolution |
|-------|------------|
| No log files | Inform user, suggest running design iterations |
| Insufficient data | Warn, show patterns anyway with low confidence |
| Malformed JSONL | Skip bad lines, continue parsing |
| /propose-learning fails | Mark pattern as pending, retry next run |
| Config missing | Use defaults (auto-contribute enabled) |

---

## Related Skills

- `/iterate-visual` - Generates feedback logs
- `/decompose` - Generates decomposition logs
- `/propose-learning` - Upstream contribution mechanism

---

## Configuration Reference

```yaml
artisan:
  feedback:
    # Master switch for feedback logging
    enabled: true

    # Log every feedback interaction
    auto_log: true

    # Log rotation settings
    rotation:
      max_files: 30        # Keep last 30 days
      max_size_mb: 10      # Or max 10MB total

    # Pattern detection settings
    pattern_detection:
      min_occurrences: 7   # Minimum for HIGH confidence
      min_consistency: 0.8 # 80% consistency for HIGH
      run_on: skill_complete  # When to detect patterns

    # Auto-contribution settings
    auto_contribute:
      enabled: true        # Set to false to disable
      notify: true         # Show notification when contributing
      require_confirmation: false  # Skip confirmation for HIGH patterns
```
