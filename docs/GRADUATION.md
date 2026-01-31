# Construct Graduation System

The Loa Constructs registry uses a maturity model to help users identify production-ready constructs and provide authors with a clear progression path.

## Maturity Levels

| Level | Badge | Description |
|-------|-------|-------------|
| **Experimental** | `experimental` | New constructs, may have breaking changes |
| **Beta** | `beta` | Stable enough for production use with caution |
| **Stable** | `stable` | Production-ready, backward-compatible |
| **Deprecated** | `deprecated` | No longer maintained, use alternatives |

All new constructs start at the `experimental` maturity level.

## Graduation Criteria

### Experimental → Beta

| Criterion | Requirement |
|-----------|-------------|
| Downloads | ≥ 10 |
| Days Published | ≥ 7 |
| Valid Manifest | Version with manifest exists |
| README | README file exists |
| CHANGELOG | CHANGELOG file exists |

**Auto-Graduation**: Constructs meeting all criteria after 14 days are automatically graduated to beta. No admin review required.

### Beta → Stable

| Criterion | Requirement |
|-----------|-------------|
| Downloads | ≥ 100 |
| Days in Beta | ≥ 30 |
| Documentation | Documentation URL provided |
| No Breaking Changes | No major version bump in 30 days |
| Rating | ≥ 3.5 average (or no ratings) |

**Admin Review Required**: Beta → Stable transitions require manual review by a registry administrator.

## Checking Your Status

Get the current graduation status for your construct:

```bash
curl https://api.constructs.network/v1/constructs/my-construct/graduation-status
```

Response:

```json
{
  "data": {
    "construct_type": "pack",
    "construct_id": "abc-123",
    "current_maturity": "experimental",
    "next_level": "beta",
    "criteria": {
      "met": {
        "min_downloads": true,
        "min_days_published": true,
        "manifest_valid": true,
        "readme_exists": true
      },
      "missing": [
        {
          "key": "changelog_exists",
          "current": false,
          "required": true
        }
      ]
    },
    "eligible_for_auto_graduation": false,
    "can_request": false,
    "pending_request": null
  }
}
```

## Requesting Graduation

Once all criteria are met, request graduation:

```bash
curl -X POST https://api.constructs.network/v1/constructs/my-construct/request-graduation \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Ready for beta release"}'
```

### Auto-Approval (Experimental → Beta)

If your construct has been published for 14+ days and meets all criteria, the request is automatically approved:

```json
{
  "data": {
    "request_id": "req-456",
    "status": "approved",
    "auto_approved": true
  },
  "message": "Graduation auto-approved. Construct is now beta."
}
```

### Pending Review (Beta → Stable)

For stable promotions, a pending request is created:

```json
{
  "data": {
    "request_id": "req-789",
    "status": "pending",
    "auto_approved": false
  },
  "message": "Graduation request submitted for review."
}
```

## Withdrawing a Request

Cancel a pending graduation request:

```bash
curl -X DELETE https://api.constructs.network/v1/constructs/my-construct/graduation-request \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Filtering by Maturity

Find constructs by maturity level:

```bash
# Get only stable constructs
curl "https://api.constructs.network/v1/constructs?maturity=stable"

# Get beta and stable constructs
curl "https://api.constructs.network/v1/constructs?maturity=beta,stable"
```

## Badge Display

Display the maturity badge in your README:

```markdown
![Maturity: Beta](https://img.shields.io/badge/maturity-beta-blue)
```

| Level | Badge |
|-------|-------|
| Experimental | ![Maturity: Experimental](https://img.shields.io/badge/maturity-experimental-orange) |
| Beta | ![Maturity: Beta](https://img.shields.io/badge/maturity-beta-blue) |
| Stable | ![Maturity: Stable](https://img.shields.io/badge/maturity-stable-green) |
| Deprecated | ![Maturity: Deprecated](https://img.shields.io/badge/maturity-deprecated-red) |

## Admin Review Process

Administrators review beta → stable graduation requests through the admin dashboard or API:

```bash
# List pending requests
curl https://api.constructs.network/v1/admin/graduations \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Approve graduation
curl -X POST https://api.constructs.network/v1/admin/graduations/REQ_ID/review \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "approved",
    "review_notes": "Meets all stable requirements"
  }'

# Reject graduation
curl -X POST https://api.constructs.network/v1/admin/graduations/REQ_ID/review \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "rejected",
    "review_notes": "Documentation needs improvement",
    "rejection_reason": "incomplete_documentation"
  }'
```

### Rejection Reasons

| Reason | Description |
|--------|-------------|
| `quality_standards` | Does not meet quality standards |
| `incomplete_documentation` | Documentation is incomplete |
| `insufficient_testing` | Needs more test coverage |
| `stability_concerns` | Stability issues detected |
| `other` | Other reason (see review notes) |

## Best Practices

1. **Start with good documentation**: Include a comprehensive README and maintain a CHANGELOG
2. **Respond to feedback**: Address issues and feature requests from users
3. **Follow semver**: Use semantic versioning to signal breaking changes
4. **Test thoroughly**: Ensure your construct works reliably before requesting graduation
5. **Be patient**: The graduation process ensures quality for all users
