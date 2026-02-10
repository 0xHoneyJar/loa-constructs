# Context Slots Guide

> How to parameterize skill packs for different projects using context overlays.

## What Are Context Slots?

Context slots are placeholders in SKILL.md files that resolve to project-specific values at runtime. They prevent **topology contamination** — hardcoded addresses, URLs, chain IDs, and other project-specific data leaking into reusable skill definitions.

### Syntax

```
{context:<slot_name>}
{context:<slot_name>.<field>}
```

**Examples:**
- `{context:chain_config}` — loads entire chain configuration object
- `{context:chain_config.network_id}` — loads specific field (`eip155:1`)
- `{context:qa_fixtures.wallets.rewards-ready.address}` — nested field access

## Resolution Order

When a skill references a context slot, the system resolves it from:

1. `contexts/overlays/<slot_name>.json` in the pack directory
2. If no overlay exists, the agent prompts the user to create one from `*.json.example`
3. Required slots cause install validation failure if missing

## Directory Structure

```
packs/<pack-name>/
  contexts/
    overlays/
      chain-config.json.example    # Template (tracked in git)
      chain-config.json            # Your values (gitignored)
    schemas/
      chain-config.schema.json     # Validation schema (tracked in git)
  manifest.json                    # Declares required/optional slots
  skills/
    <skill-name>/
      SKILL.md                     # References {context:chain_config.network_id}
```

## Step-by-Step: Setting Up Overlays

### 1. Copy the Example File

```bash
cd packs/crucible/contexts/overlays/
cp qa-fixtures.json.example qa-fixtures.json
```

### 2. Fill in Your Values

Edit `qa-fixtures.json` with your project-specific data:

```json
{
  "wallets": {
    "rewards-ready": {
      "address": "0x_YOUR_REWARDS_TEST_WALLET_ADDRESS_HERE_00",
      "description": "Wallet with claimable rewards for testing claim flows",
      "fixture_name": "rewards-ready"
    },
    "new-user": {
      "address": "0x_YOUR_NEW_USER_WALLET_ADDRESS_HERE_000000",
      "description": "Fresh wallet with no history for onboarding testing",
      "fixture_name": "new-user"
    }
  }
}
```

### 3. Verify Against Schema

The schema file validates your overlay structure:

```bash
# The validation script checks this automatically
scripts/validate-topology.sh --relaxed
```

### 4. Confirm Gitignore

Overlay files with real values must never be committed. Verify:

```bash
git check-ignore contexts/overlays/qa-fixtures.json
# Should output the file path (meaning it IS ignored)
```

## Required vs Optional Slots

### Required Slots

Declared in `manifest.json` under `required_slots`. Pack installation fails if these are missing.

```json
{
  "required_slots": ["qa_fixtures", "dev_environment"]
}
```

Each required slot must have a corresponding schema at `contexts/schemas/<slot_name>.schema.json`.

### Optional Slots

Declared under `optional_slots`. The skill gracefully skips if missing.

```json
{
  "optional_slots": ["product_states"]
}
```

## Overlay Security

| File Pattern | Git Status | Contains |
|-------------|------------|----------|
| `*.json.example` | **Tracked** | Placeholder values only |
| `*.json` (overlays) | **Gitignored** | Real project-specific values |
| `*.schema.json` | **Tracked** | Validation rules |

**Rule:** Never commit real overlay files. The CI topology validation gate (`scripts/validate-topology.sh --strict`) checks for this.

## Worked Example: Crucible QA Fixtures

The Crucible pack uses context slots to parameterize E2E test fixtures.

### Schema (`contexts/schemas/qa-fixtures.schema.json`)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "QA Fixtures",
  "type": "object",
  "required": ["wallets"],
  "properties": {
    "wallets": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["address", "description"],
        "properties": {
          "address": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
          "description": { "type": "string" },
          "fixture_name": { "type": "string" }
        }
      }
    }
  }
}
```

### Example File (`contexts/overlays/qa-fixtures.json.example`)

```json
{
  "wallets": {
    "rewards-ready": {
      "address": "0x_YOUR_REWARDS_TEST_WALLET_ADDRESS_HERE_00",
      "description": "Wallet with claimable rewards for testing claim flows",
      "fixture_name": "rewards-ready"
    }
  }
}
```

### Usage in SKILL.md

```markdown
## QA Fixture Integration

Load test wallet from context:

The rewards-ready wallet at `{context:qa_fixtures.wallets.rewards-ready.address}`
should have claimable rewards visible in the dashboard.
```

## Worked Example: Beacon Chain Config

The Beacon pack parameterizes blockchain network configuration.

### Example File (`contexts/overlays/chain-config.json.example`)

```json
{
  "network_id": "eip155:1",
  "chain_name": "Ethereum",
  "default_token": "ETH",
  "org_name": "YourOrg",
  "payment_facilitator_url": "https://x402.org/facilitator",
  "block_explorer_url": "https://etherscan.io"
}
```

### Usage in SKILL.md

```markdown
Configure the x402 middleware for `{context:chain_config.chain_name}`:

- Network: `{context:chain_config.network_id}`
- Token: `{context:chain_config.default_token}`
- Facilitator: `{context:chain_config.payment_facilitator_url}`
```

## Validation

Run the topology validation script to verify all context slots are properly configured:

```bash
# Strict mode (CI) — no allowlist
scripts/validate-topology.sh --strict

# Relaxed mode (local) — with project-specific allowlist
scripts/validate-topology.sh --relaxed --allowlist .topology-allowlist
```

The script checks:
- Required slots have corresponding schema files
- No non-example overlay files are tracked in git
- No hardcoded addresses/URLs appear outside example blocks
