# Skill: accepting-payments

> Generate x402 v2 payment middleware and route handlers for agent commerce.
>
> **Required context:** `chain_config` — see `contexts/overlays/chain-config.json.example`

## Purpose

Turn any Next.js API route into a paid endpoint using the x402 protocol. This skill generates:

1. **Payment Middleware** - Verify X-Payment headers, generate 402 responses
2. **Rate Limiter** - Per-agent, per-IP, and subsidy budget enforcement
3. **Lifecycle Hooks** - Payment flow event handlers

## Trigger

```
/beacon-pay [options]
```

**Options:**
- `--endpoint PATH` - Generate for specific endpoint only
- `--subsidy PERCENT` - Default subsidy percentage (0-100)
- `--token TOKEN` - Payment token (default: `{context:chain_config.default_token}`)

## Workflow

### Phase 1: Reality Detection

1. **Check for existing x402 setup**
   ```bash
   # Look for existing middleware
   find lib/x402 -name "*.ts" 2>/dev/null

   # Check for discovery endpoint
   [[ -f app/.well-known/x402/route.ts ]]
   ```

2. **If no discovery endpoint exists**
   - Recommend running `/beacon-discover` first
   - Ask user if they want to continue anyway

### Phase 2: Collect Configuration

1. **Use AskUserQuestion to gather:**
   - Endpoint paths to enable (multiSelect from detected routes)
   - Pricing per endpoint (amount in `{context:chain_config.default_token}`)
   - Subsidy configuration (percentage, max per agent)
   - Rate limits (per-agent, per-IP)

2. **Default configuration:**
   ```typescript
   {
     endpoints: ['/api/generate-image'],
     pricing: { '/api/generate-image': '1' },
     subsidy: { enabled: true, percentage: 50, maxPerAgent: 50 },
     rateLimits: {
       perAgent: { max: 10, window: '1h' },
       perIP: { max: 50, window: '1h' },
       dailySubsidy: 1000
     }
   }
   ```

### Phase 3: Generate Middleware

1. **Create `lib/x402/middleware.ts`**
   - Use template from `resources/templates/middleware.ts.md`
   - Fill in pricing configuration
   - Configure facilitator URL

2. **Middleware responsibilities:**
   - Parse `X-Payment` header
   - Verify payment signature
   - Generate 402 response with requirements
   - Execute lifecycle hooks

### Phase 4: Generate Rate Limiter

1. **Create `lib/x402/ratelimit.ts`**
   - Use template from `resources/templates/ratelimit.ts.md`
   - Configure per-agent limits
   - Configure per-IP limits
   - Configure subsidy budget

2. **Rate limit structure:**
   ```typescript
   interface RateLimitConfig {
     perAgent: { max: number; window: string };
     perIP: { max: number; window: string };
     subsidyBudget: { daily: number; perAgent: number };
   }
   ```

### Phase 5: Generate Hooks

1. **Create `lib/x402/hooks.ts`**
   - Use template from `resources/templates/hooks.ts.md`
   - Include all 4 lifecycle hooks
   - Add logging and metrics placeholders

2. **Lifecycle hooks:**
   | Hook | When | Purpose |
   |------|------|---------|
   | `onPaymentRequired` | Before 402 | Add subsidy info, custom headers |
   | `onPaymentVerified` | Signature valid | Audit trail, agent tracking |
   | `onSettlementComplete` | Payment settled | Execute business logic |
   | `onSettlementFailed` | Settlement error | Rollback, notify |

### Phase 6: Update Route Handlers

1. **For each selected endpoint:**
   - Wrap handler with x402 middleware
   - Add payment verification
   - Integrate hooks

2. **Example integration:**
   ```typescript
   import { withX402 } from '@/lib/x402/middleware';

   export const POST = withX402(
     async (req, { payment }) => {
       // Business logic here
       // payment.agentAddress available
     },
     { price: '1', token: '{context:chain_config.default_token}' }
   );
   ```

### Phase 7: Update State

Update `grimoires/beacon/state.yaml`:
```yaml
payments:
  middleware_generated: true
  last_generation: "{timestamp}"
  endpoints:
    - path: /api/generate-image
      price: 1
      token: "{context:chain_config.default_token}"
      subsidy: 50%
  rate_limits:
    per_agent: 10/h
    per_ip: 50/h
    daily_subsidy: 1000
```

## x402 v2 Protocol Reference

### Request Flow

```
Agent                          Service                    Facilitator
  │                               │                           │
  ├──── POST /api/generate ──────►│                           │
  │     (no X-Payment)            │                           │
  │                               │                           │
  │◄──── 402 Payment Required ────┤                           │
  │      X-Payment-Required: {...}│                           │
  │      X-Payment-Version: 2     │                           │
  │                               │                           │
  ├──── POST /api/generate ──────►│                           │
  │     X-Payment: {signed}       │                           │
  │                               ├──── verify ──────────────►│
  │                               │◄─── receipt ──────────────┤
  │                               │                           │
  │◄──── 200 OK ──────────────────┤                           │
  │      X-Payment-Receipt: {...} │                           │
```

### Headers

**402 Response Headers:**
```
X-Payment-Required: base64({
  "version": "2.0",
  "network": "{context:chain_config.network_id}",
  "token": "{context:chain_config.default_token}",
  "amount": "1000000000000000000",
  "recipient": "0x...",
  "validUntil": 1234567890
})
X-Payment-Version: 2
X-Payment-Token: {context:chain_config.default_token}
```

**Payment Request Header:**
```
X-Payment: base64({
  "version": "2.0",
  "signature": "0x...",
  "payload": {...}
})
```

### Facilitator Integration

Default facilitator URL from context:
```
{context:chain_config.payment_facilitator_url}
```

The facilitator:
- Verifies payment signatures
- Issues settlement receipts
- Handles subsidy tracking

## Templates

| Template | Output |
|----------|--------|
| `middleware.ts.md` | `lib/x402/middleware.ts` |
| `ratelimit.ts.md` | `lib/x402/ratelimit.ts` |
| `hooks.ts.md` | `lib/x402/hooks.ts` |

## Edge Cases

### No API Routes Found

If no API routes detected:
1. Ask user to specify endpoint path manually
2. Generate middleware and hooks anyway
3. Note in state that routes need manual integration

### Existing x402 Setup

If middleware already exists:
1. Show diff of what would change
2. Ask user to confirm overwrite
3. Backup existing files to `.backup/`

### Non-Default Token

If user specifies a token different from `{context:chain_config.default_token}`:
1. Warn that the configured default token is recommended for the target chain
2. Allow configuration but note in comments
3. Update discovery endpoint if it exists

## Example Session

```
> /beacon-pay

[Phase 1] Checking for existing x402 setup...
✓ Discovery endpoint found at /.well-known/x402

[Phase 2] Collecting configuration...

Which endpoints should accept payments?
☑ /api/generate-image
☐ /api/download-image
☑ /api/mint

What price for /api/generate-image?
> 1 {context:chain_config.default_token}

Enable subsidy? (Recommended)
> Yes, 50%

[Phase 3] Generating middleware...
✓ Created lib/x402/middleware.ts

[Phase 4] Generating rate limiter...
✓ Created lib/x402/ratelimit.ts

[Phase 5] Generating hooks...
✓ Created lib/x402/hooks.ts

[Phase 6] Updating route handlers...
✓ Updated app/api/generate-image/route.ts
✓ Updated app/api/mint/route.ts

[Phase 7] Updating state...
✓ Updated grimoires/beacon/state.yaml

Payment middleware generated!

Next steps:
1. Review generated middleware
2. Configure FACILITATOR_URL in .env
3. Test with: curl -X POST /api/generate-image
4. Deploy and announce x402 support
```

## Security Considerations

1. **Never store private keys in code**
   - Middleware only verifies, never signs
   - Signing happens agent-side

2. **Validate facilitator responses**
   - Check receipt signatures
   - Verify amounts match

3. **Rate limiting is defense in depth**
   - Payment doesn't bypass rate limits
   - Subsidy has hard caps

4. **Audit trail**
   - Log all payment events
   - Include agent addresses in logs
