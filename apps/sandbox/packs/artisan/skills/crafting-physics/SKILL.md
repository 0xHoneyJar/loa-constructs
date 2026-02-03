---
name: crafting-physics
description: Design physics system for UI interactions - sync strategies, timing, confirmations
user-invocable: true
allowed-tools: Read, Write, Glob, Grep, Edit
---

# Crafting Physics

Design physics system for UI interactions. Determines sync strategies, timing values, and confirmation patterns based on the effect of user actions.

## Trigger

```
/physics
```

## Overview

**Effect is truth.** What the code does determines its physics.

**Physics over preferences.** "Make it feel trustworthy" is not physics. "800ms pessimistic with confirmation" is physics.

Use this skill when:
- Implementing mutations (create, update, delete operations)
- Designing loading states and feedback
- Determining confirmation patterns
- Setting timing values for interactions

## Quick Decision Tree

```
Is this a financial operation (transfer, claim, stake)?
└── YES → Pessimistic sync, 800ms, confirmation required

Is this destructive and irreversible?
└── YES → Pessimistic sync, 600ms, confirmation required

Is this destructive but reversible (archive, trash)?
└── YES → Optimistic sync, 200ms, toast with undo

Is this a standard CRUD operation?
└── YES → Optimistic sync, 200ms, no confirmation

Is this navigation or local state?
└── YES → Immediate, 100-150ms, no confirmation
```

## Physics Table

| Effect | Sync Strategy | Timing | Confirmation |
|--------|---------------|--------|--------------|
| Financial | Pessimistic | 800ms | Required |
| Destructive | Pessimistic | 600ms | Required |
| Soft Delete | Optimistic | 200ms | Toast + Undo |
| Standard | Optimistic | 200ms | None |
| Navigation | Immediate | 150ms | None |
| Local State | Immediate | 100ms | None |

## Workflow

### Phase 1: Detect Effect

Identify the effect type from keywords and types:

#### Priority Order

1. **Types** — `Currency`, `Wei`, `Token`, `Amount` → Always Financial
2. **Keywords** — Match against effect keyword lists
3. **Context** — Phrases like "with undo" modify the effect

#### Keywords by Effect

**Financial:**
```
claim, deposit, withdraw, transfer, swap, send, pay, mint, burn,
stake, unstake, bridge, approve, redeem, liquidate
```

**Destructive:**
```
delete, remove, destroy, revoke, terminate, purge, erase, wipe,
clear, reset, ban, suspend
```

**Soft Delete (reversible):**
```
archive, hide, trash, dismiss, snooze, mute, disable
```

**Standard:**
```
save, update, edit, create, add, like, follow, bookmark,
favorite, star, comment, reply
```

**Local State:**
```
toggle, switch, expand, collapse, select, focus, show, hide,
open, close, theme, filter, sort
```

### Phase 2: Apply Sync Strategy

#### Pessimistic Sync

Wait for server confirmation before updating UI.

```typescript
// Pessimistic - wait for server
const handleClaim = async () => {
  setIsLoading(true);
  try {
    await claimReward(tokenId);
    // Only update UI after success
    setBalance(prev => prev + reward);
    toast.success("Claim successful");
  } catch (error) {
    toast.error("Claim failed");
  } finally {
    setIsLoading(false);
  }
};
```

**Use for:** Financial, Destructive operations

**Key rules:**
- No `onMutate` callbacks (no optimistic updates)
- Loading states must be present
- Disable interactions during pending state
- Show clear success/failure feedback

#### Optimistic Sync

Update UI immediately, rollback on failure.

```typescript
// Optimistic - update immediately, rollback on failure
const mutation = useMutation({
  mutationFn: archiveItem,
  onMutate: async (itemId) => {
    await queryClient.cancelQueries(['items']);
    const previous = queryClient.getQueryData(['items']);
    queryClient.setQueryData(['items'], (old) =>
      old.filter(item => item.id !== itemId)
    );
    return { previous };
  },
  onError: (err, itemId, context) => {
    queryClient.setQueryData(['items'], context.previous);
    toast.error("Failed to archive");
  },
  onSuccess: () => {
    toast.success("Archived", {
      action: { label: "Undo", onClick: () => unarchive(itemId) }
    });
  },
});
```

**Use for:** Soft Delete, Standard operations

**Key rules:**
- Save previous state for rollback
- Provide undo option for destructive actions
- Keep undo window reasonable (5-10 seconds)

#### Immediate

No server round-trip needed.

```typescript
// Immediate - local state only
const [isExpanded, setIsExpanded] = useState(false);

const handleToggle = () => {
  setIsExpanded(prev => !prev);
};
```

**Use for:** Navigation, Local State changes

### Phase 3: Set Timing

| Operation | Minimum | Typical | Maximum |
|-----------|---------|---------|---------|
| Local toggle | 100ms | 100ms | 150ms |
| Navigation | 150ms | 150ms | 200ms |
| Standard CRUD | 200ms | 200ms | 300ms |
| Soft delete | 200ms | 200ms | 300ms |
| Destructive | 600ms | 600ms | 800ms |
| Financial | 800ms | 800ms | 1000ms |

**Timing Rules:**
- Never go below minimum for effect type
- Longer timing = more perceived importance
- Match timing to cognitive load of decision

### Phase 4: Add Confirmation

#### Required Confirmation (Financial/Destructive)

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete Account</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete your account?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. All your data will be permanently deleted.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>
        Delete Account
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

#### Toast with Undo (Soft Delete)

```tsx
const handleArchive = () => {
  archiveMutation.mutate(itemId);
  toast("Item archived", {
    action: {
      label: "Undo",
      onClick: () => unarchiveMutation.mutate(itemId),
    },
    duration: 5000, // 5 second undo window
  });
};
```

### Phase 5: Validate Protected Capabilities

Always verify these are preserved:

| Capability | Rule | Check |
|------------|------|-------|
| Withdraw | Always reachable | No UI can block access to withdrawal |
| Cancel | Always visible | Cancel button never hidden during loading |
| Balance | Always accurate | Never show stale or optimistic balance |
| Touch target | >= 44px | All interactive elements have minimum size |
| Focus ring | Always visible | Keyboard navigation always shows focus |

## Self-Validation Checklist

After implementing, verify:

```
Physics Compliance:
├── [ ] Sync strategy matches effect type
├── [ ] Loading states present for pessimistic
├── [ ] Timing meets minimum for effect
└── [ ] Confirmation present if required

Protected Capabilities:
├── [ ] Cancel always visible during operations
├── [ ] Withdraw always reachable
├── [ ] Touch targets >= 44px
└── [ ] Focus rings visible

Patterns:
├── [ ] Optimistic updates have rollback
├── [ ] Toasts have undo for soft delete
└── [ ] Error states are handled
```

## Common Patterns

### Loading Button

```tsx
<Button disabled={isLoading} className="min-h-[44px]">
  {isLoading ? (
    <>
      <Spinner className="mr-2 h-4 w-4 animate-spin" />
      Processing...
    </>
  ) : (
    "Submit"
  )}
</Button>
```

### Protected Cancel

```tsx
// Cancel button always visible, never disabled
<div className="flex gap-2">
  <Button variant="outline" onClick={onCancel}>
    Cancel
  </Button>
  <Button disabled={isLoading} onClick={onSubmit}>
    {isLoading ? "Saving..." : "Save"}
  </Button>
</div>
```

### Financial Operation

```tsx
const handleWithdraw = async () => {
  // 1. Show confirmation first
  const confirmed = await confirm({
    title: "Withdraw funds?",
    description: `You are about to withdraw ${formatAmount(amount)}`,
  });

  if (!confirmed) return;

  // 2. Pessimistic sync with 800ms minimum display
  setIsLoading(true);
  const startTime = Date.now();

  try {
    await withdrawFunds(amount);

    // Ensure minimum 800ms for perceived importance
    const elapsed = Date.now() - startTime;
    if (elapsed < 800) {
      await sleep(800 - elapsed);
    }

    // 3. Only update after success
    refetchBalance();
    toast.success("Withdrawal complete");
  } catch (error) {
    toast.error("Withdrawal failed");
  } finally {
    setIsLoading(false);
  }
};
```

## Quick Reference Card

```
EFFECT DETECTION:
├── Financial → claim, deposit, withdraw, transfer, stake
├── Destructive → delete, remove, destroy, revoke
├── Soft Delete → archive, hide, trash (with undo)
├── Standard → save, update, create, add
└── Local → toggle, expand, select, filter

SYNC STRATEGY:
├── Pessimistic → Wait for server (Financial, Destructive)
├── Optimistic → Update then rollback (Soft Delete, Standard)
└── Immediate → No server call (Local State)

TIMING MINIMUMS:
├── Financial: 800ms
├── Destructive: 600ms
├── Standard: 200ms
└── Local: 100ms

PROTECTED:
├── Withdraw always reachable
├── Cancel always visible
├── Balance always accurate
├── Touch targets >= 44px
└── Focus rings visible
```
