# Augus Landing Page — Brief for New Session

## What This Is

A brief to hand to a new Claude Code session for building a landing page / marketing site for Augus. This is a separate repo from the main Augus app — it's a static site that explains what Augus is and why museums should use it.

## What Is Augus?

Augus is a free, self-hosted, mobile-first web audioguide system for museums and exhibitions. Visitors scan QR codes on exhibit labels to hear narrated audio, view image galleries (including 360° photos, 3D models, and videos), read synced subtitles, and navigate via maps. All content is managed through a simple admin interface. Built on PocketBase (single binary backend) with vanilla JS — no app store, no downloads, works in any browser.

## Target Audience

**Primary:** Museum staff, exhibition designers, cultural institution employees evaluating audio guide solutions. They're comparing Augus against commercial services (which cost per-visitor or per-month) and looking for something they can self-host for free.

**Secondary:** Developers/tech people who might set it up for a museum, school, or cultural project.

## Key Selling Points (in order of importance)

1. **Free and self-hosted** — no per-visitor fees, no subscriptions, your data stays on your server
2. **No app download required** — visitors just scan a QR code, works in any mobile browser
3. **Easy content management** — non-technical museum staff can add exhibitions, upload audio, manage images
4. **Multi-language support** — any number of languages per exhibition, with dynamic UI translations for 18+ languages including Swedish minority languages
5. **Rich media** — audio with synced subtitles, image galleries, 360° panoramas, 3D models, video with subtitles
6. **Indoor and outdoor** — floor plans with clickable pins, or GPS-tracked outdoor maps with auto-play when visitors approach objects
7. **Accessible** — WCAG 2.1 AA, screen reader support, large font options, lock-screen playback
8. **Lightweight** — single PocketBase binary, Docker-ready, runs on a $5/month VPS

## Features to Highlight

- QR code scanning (built-in scanner + direct URL access)
- Audio player with synced subtitles (WebVTT)
- Image carousel and full-screen gallery
- 360° photo viewer (Pannellum)
- 3D model viewer (Google model-viewer, with AR support)
- Video support with per-language subtitles
- Multi-floor indoor maps with numbered/colored pins
- Outdoor GPS maps with proximity-triggered audio
- Object groupings (rooms/sections) with custom colors
- Sequential navigation (previous/next) or free exploration mode
- Customizable colors, fonts, and branding per exhibition
- About page with WYSIWYG editor
- Multi-exhibition support (one instance, multiple exhibitions)
- Lock-screen audio controls
- Persistent playback speed preference
- "Powered by Augus" branding (optional, toggleable)

## What the Site Should Include

1. **Hero section** — one-sentence pitch + screenshot/mockup of the app on a phone
2. **Feature overview** — visual feature list with icons or screenshots
3. **How it works** — 3-step: "Upload content → Print QR codes → Visitors scan and listen"
4. **Demo link** — link to a live demo exhibition (https://augus.betaversion.se)
5. **Self-hosting instructions** — or link to the README
6. **GitHub link** — link to the repo (https://github.com/nielsswinkels/augus)
7. **License** — AGPL-3.0

## Design Direction

- Clean, modern, minimal — like the app itself
- Mobile-first (museum staff will probably find this on their phone too)
- Light background, the Augus logo prominently placed
- No flashy animations — let the product speak
- Could use the app's own color scheme (primary blue #0057b8) for consistency

## Technical Preferences

- Static site — no backend needed
- GitHub Pages or similar free hosting
- Single HTML file is fine, or a simple static site generator
- No framework needed — vanilla HTML/CSS/JS
- Responsive

## Logo

The Augus logo already exists and is used in the main repo. It can be found at whatever path the user provides, or extracted from the app's admin header.

## The "Powered by Augus" Link

The main Augus app has a "Powered by Augus" footer on the About page. This should link to the landing page once it exists. Currently links nowhere.

## Repo Name Suggestion

`augus-site` or `augus.github.io` (if using GitHub Pages with a custom domain)

## What NOT to Build

- Not a documentation site (docs live in the main repo)
- Not a hosted/SaaS version of Augus
- Not a blog or news site
- Keep it to one page — don't over-engineer
