# QR Sign Design Guide

Best practices and templates for designing the physical signs that visitors scan to access audio guides.

## Why People Don't Scan

Common mistakes that lead to low engagement:

- **"Scan here" with no context** — gives no reason to scan. People are trained to ignore random QR codes (menus, ads, spam).
- **No value proposition** — the visitor doesn't know what they'll get. Audio? Text? A website? How long will it take?
- **Generic appearance** — if the sign looks like an afterthought (plain white paper, small QR code), visitors assume the content is low-effort too.
- **QR fatigue** — after COVID-era QR menus everywhere, people need a stronger reason to pull out their phone.

## What Works

### 1. Lead with the reward, not the action

Instead of "Scan here" or "Curious?", tell the visitor what they get:

- ✅ "Listen to the story behind this artwork"
- ✅ "Hear the artist explain this piece"
- ✅ "2-minute audio guide"
- ❌ "Scan QR code"
- ❌ "Curious? Scan here"

### 2. Show what's inside

Set expectations so visitors know what they're committing to:

- Duration: "1 min audio" or "3 min audio guide"
- Content type: headphone icon 🎧 signals audio
- Language availability: small flag icons or text like "EN / SV"
- Image count: "5 photos" (if the object has a rich gallery)

### 3. Match the exhibition's visual language

Signs should feel like part of the exhibition, not a tech add-on:

- Use the exhibition's color scheme and typography
- Same material/finish as other signage in the space
- Consistent positioning across all objects (e.g. always bottom-right of the display case)

### 4. Number the objects

Even if the app can hide numbers, numbered signs create a sense of completeness:

- "Object 3 of 12" triggers collection/completionist behavior
- Visitors can see they've only done 3 and there are 9 more to discover
- Numbers also help with wayfinding: "Go find number 7"

### 5. Size and placement

- QR code should be at least 2×2 cm for reliable scanning
- Place at a comfortable scanning height (120-150 cm from the floor)
- Ensure adequate lighting — QR codes in dark corners don't scan well
- Leave some white space around the QR code (quiet zone)

## Template Ideas

### Template A: Minimal

Best for: clean, modern exhibitions where the objects speak for themselves.

```
┌─────────────────────────┐
│  3                      │
│  Object Name            │
│                         │
│  🎧 1 min               │
│  [QR CODE]              │
│                         │
└─────────────────────────┘
```

### Template B: Rich

Best for: exhibitions where visitors need more context or encouragement to scan.

```
┌─────────────────────────┐
│  3  Object Name         │
│                         │
│  "The story of how this │
│   artifact was found..." │
│                         │
│  🎧 2 min  ·  EN / SV   │
│  [QR CODE]              │
└─────────────────────────┘
```

### Template C: Wall Label Integration

Best for: traditional museums where objects already have descriptive labels.

```
┌─────────────────────────┐
│  Artist Name            │
│  Title of Work, 1923    │
│  Oil on canvas          │
│  Collection: Museum X   │
│                         │
│  🎧 Audio guide         │
│  [QR CODE]              │
└─────────────────────────┘
```

### Template D: Outdoor / Trail

Best for: outdoor exhibitions, sculpture parks, nature trails.

```
┌─────────────────────────┐
│  STOP 3                 │
│  The Old Oak Tree       │
│                         │
│  🎧 Listen to the story │
│  [QR CODE]              │
│                         │
│  📍 GPS-guided tour     │
│     continues to Stop 4 │
└─────────────────────────┘
```

## Context-Specific Tips

### Museums
- Integrate with existing label system
- Consider a "first object" introductory sign that explains the audio guide system: "This exhibition has an audio guide. Scan any QR code to start."
- Place a large welcome sign at the entrance with instructions

### Offices / Informal Spaces
- People won't scan unless the content sounds interesting personally
- Try: "The Story of [Thing] — 🎧 1 min audio" rather than just "Scan here"
- Add a visual element (photo, illustration) to catch attention

### Outdoor Exhibitions
- Weather-resistant materials (laminated, metal, or UV-resistant print)
- Larger QR codes (scanning distance is greater outdoors)
- Mention GPS features: "Your phone will guide you to the next stop"

### Events / Temporary Installations
- Include the exhibition name prominently (visitors may not know where they are)
- Consider table tents or standing cards rather than wall-mounted signs
- Add a "First time? Start here" marker at the entrance

## Implementation Notes

The admin already generates QR codes per object. A sign template generator would:

1. Let the admin choose a template (A/B/C/D or custom)
2. Auto-fill: object number, name (in configured languages), QR code URL
3. Apply the set's color scheme and custom font
4. Generate a print-ready PDF (single sign or batch for all objects)
5. Support custom teaser text per object (optional field)
