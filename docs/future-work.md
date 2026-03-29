# Augus — Future Work & Ideas

A collection of planned features, improvements, and ideas for future development sessions.

## Planned (with implementation plans)

### Blind User / Accessibility Mode
Full accessibility mode for blind and low-vision visitors. Continuous QR scanning, auto-play, gesture navigation, TTS feedback.
- **Plan:** `docs/plan-blind-user-mode.md`
- **Scope:** 4-7 sessions across 3 phases

### Flexible Language System
Replace hardcoded Swedish/English with dynamic per-set language configuration. Any number of languages per set.
- **Plan:** `docs/plan-flexible-languages.md`
- **Scope:** 5-7 sessions

### Object Groupings (#2)
Group multiple objects together within a set. Groups have a title and sort order. In list view, grouped objects are visually enclosed with a border and group title header. No impact on map view, no nested groups.
- **Design:** Groups collection with `title_en`, `title_sv`, `sort_order`, relation to set. Objects get a nullable `group` relation. Objects within a group have their own sort_order for internal ordering.
- **Admin:** Dropdown on object form to assign to group. Drag-to-reorder groups and objects within groups.
- **Scope:** 1-2 sessions

---

## Ideas (need design work)

### Easy Audio Recording (#3)
Record audio directly in the admin interface. Save as MP3, auto-send to Whisper API for subtitle/transcription generation.
- **Open questions:** Which Whisper API (OpenAI hosted vs self-hosted)? Where to store API key? In-browser MP3 encoding library?
- **Approach:** Record via MediaRecorder API → upload as audio file → server-side proxy to Whisper → convert response to VTT → attach to object
- **Scope:** 2-3 sessions

### Landscape Mode (#12)
The system currently looks poor in landscape orientation. Needs a new responsive layout.
- **Ideas:** Two-column layout (thumbnail + subtitles side by side), auto-collapse audio player to slim bar, `@media (orientation: landscape)` rules
- **Challenge:** Can't force portrait on web. Need a design that works well in both orientations.
- **Scope:** 1-2 sessions (mostly design + CSS)

### Documentation (#18)
Comprehensive documentation for self-hosting. README with setup guide, deployment instructions, configuration reference, and "Getting Started" tutorial.
- **Audience:** Museum staff or developers with basic technical skills
- **Should cover:** Docker setup, PocketBase admin, creating first set/objects, QR code printing, custom domain, Caddy configuration
- **Scope:** 1 session

---

## Small improvements to consider

- **Auto-redeploy (#14):** GitHub Actions workflow or webhook for automatic VPS deployment on push
- **Help section (#7):** Probably not needed if the UI is intuitive enough — revisit after user testing
- **Batch operations in admin:** Multi-select objects for bulk delete, move between sets
- **Audio waveform visualization:** Show waveform in the player instead of just a progress bar
- **Offline/PWA support:** Service worker for caching audio and content for offline use in museums with poor WiFi
- **QR code batch printing:** Admin tool to generate a printable PDF of all QR codes for a set
- **Analytics:** Simple view/play counts per object (privacy-friendly, no tracking)
- **Multi-set navigation:** Allow visitors to browse between sets if a museum has multiple exhibitions
