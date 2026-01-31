# Construct Graduation Guide

This guide explains the maturity system for constructs (skills and packs) in the Loa Constructs registry.

## Maturity Levels

Every construct progresses through maturity levels that signal reliability to users:

| Level | Badge | Description |
|-------|-------|-------------|
| **Experimental** | `[EXP]` | Newly published, early adopters only, may have breaking changes |
| **Beta** | `[BETA]` | Functional but still gathering feedback, API may change |
| **Stable** | `[STABLE]` | Production-ready, follows semver, full documentation |
| **Deprecated** | `[DEP]` | End-of-life, will be removed in future |

## Graduation Criteria

### Experimental to Beta

To graduate from experimental to beta, your construct must meet:

- [ ] **10+ downloads** - Evidence of adoption
- [ ] **7+ days published** - Time for initial feedback
- [ ] **Valid manifest.json** - Passes schema validation
- [ ] **README.md exists** - Basic documentation
- [ ] **CHANGELOG.md exists** - Version history tracked

**Auto-graduation**: Constructs meeting all criteria for 14+ days are automatically promoted to beta.

### Beta to Stable

To graduate from beta to stable, your construct must meet:

- [ ] **100+ downloads** - Proven adoption
- [ ] **30+ days in beta** - Extended feedback period
- [ ] **Documentation URL provided** - Link to full docs
- [ ] **No breaking changes in 30 days** - No major version bumps
- [ ] **Rating >= 3.5** (if rated) - Positive user feedback
- [ ] **Admin review passed** - Manual quality check

**Note**: Stable graduation always requires admin review.

## Checking Your Status

### Via API

```bash
# Check graduation status (coming soon)
curl https://api.constructs.loa.dev/v1/constructs/my-pack/graduation-status

# Response shows current maturity and criteria progress
{
  "current_maturity": "experimental",
  "next_level": "beta",
  "criteria": {
    "met": ["manifest_valid", "readme_exists"],
    "missing": ["min_downloads (3/10)", "min_days_published (2/7)"]
  }
}
```

### In Search Results

The `/v1/constructs` endpoint includes maturity in responses:

```bash
curl "https://api.constructs.loa.dev/v1/constructs?maturity=stable"
```

Filter options: `experimental`, `beta`, `stable`, `deprecated`

## Requesting Graduation

### When Eligible

Once all criteria are met, request graduation via API:

```bash
# Request graduation (coming soon)
curl -X POST https://api.constructs.loa.dev/v1/constructs/my-pack/request-graduation \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"target_maturity": "beta", "request_notes": "Ready for beta users"}'
```

### Review Process

| Transition | Review Type | Timeline |
|------------|-------------|----------|
| experimental -> beta | Auto-approved (if criteria met 14+ days) | Immediate |
| beta -> stable | Admin review | 48h SLA |

## Best Practices

### For Experimental Constructs

- Clearly document limitations
- Use semver pre-release versions (e.g., `0.x.x`)
- Welcome feedback from early adopters

### For Beta Constructs

- Maintain a changelog
- Document breaking changes clearly
- Respond to user issues promptly

### For Stable Constructs

- Follow semantic versioning strictly
- Avoid breaking changes (use deprecation)
- Keep documentation up to date

## Deprecation

To deprecate a construct:

1. Set maturity to `deprecated` via API or admin action
2. Update README with deprecation notice
3. Provide migration path if replacement exists
4. Construct remains installable but flagged

---

## Related Documentation

- [Contributing Packs](./CONTRIBUTING-PACKS.md) - How to publish constructs
- [API Reference](https://api.constructs.loa.dev/docs) - Full API documentation
