# Artisan Inspiration Context

This folder contains visual grounding for AI-assisted design iteration.

## Quick Start

1. **Add screenshots** to `moodboard/` - sites/designs that inspire you
2. **Document references** in `references.md` - what you like about each
3. **Define direction** in `direction.md` - what you want vs avoid

## How AI Uses This

When you're iterating on design:

1. **Reads moodboard images** - understands the visual "vibe" you're targeting
2. **Uses references.md vocabulary** - "more like Stripe's whitespace" becomes actionable
3. **Validates against direction.md** - warns if changes conflict with stated goals
4. **Tracks evolution** - snapshots taste changes over time

## Example Workflow

```
User: "Make the card feel more premium"

AI: [reads direction.md: "premium = spacious, subtle shadows"]
AI: [references moodboard/stripe-card.png for visual context]
AI: [applies p-6 padding, shadow-sm]
AI: [captures screenshot]
AI: "I added generous padding and subtle elevation based on your
     Stripe reference. Does this feel closer to premium?"
```

## Folder Structure

```
inspiration/
├── README.md          # You are here
├── direction.md       # What we want vs avoid
├── references.md      # Links + notes on each reference
├── moodboard/         # Visual reference images
│   ├── .gitkeep
│   └── {source}-{element}.png
└── evolution/         # Taste evolution snapshots
    ├── .gitkeep
    └── {YYYY-MM-DD}-{label}.md
```

## Tips

- **Keep moodboard focused**: 5-10 images is ideal. Too many dilutes the direction.
- **Be specific in references**: "Stripe's whitespace" is better than "clean design"
- **Update direction.md** when your taste evolves - it's a living document
- **Add anti-references**: Knowing what to avoid is as important as what to emulate

## Related

- `grimoires/artisan/taste.md` - Generated taste tokens
- `/synthesize` - Extract taste from references
- `/inscribe` - Apply taste to components
