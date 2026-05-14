# Augus — Future Work & Ideas

A collection of planned features, improvements, and ideas for future development sessions.

## Planned (with implementation plans)

### Blind User / Accessibility Mode
Full accessibility mode for blind and low-vision visitors. Continuous QR scanning, auto-play, gesture navigation, TTS feedback.
- **Plan:** `docs/plan-blind-user-mode.md`
- **Scope:** 4-7 sessions across 3 phases

### ~~Object Groupings (#2)~~ ✅ Done
Groups collection with `group_content` for multilingual titles, optional per-group color, sort_order. Objects have nullable group relation. Visitor list interleaves groups and ungrouped objects by sort_order. Group color applied to map pins with contrast-aware text. Cluster pins changed to rounded rectangles to distinguish from colored pins.

---

## Ideas (need design work)

### Video Support in Gallery & Carousel
Add video clips alongside photos in the image carousel and gallery. Start with self-hosted short video files (uploaded like images) using a `<video>` tag with a play button overlay — avoids privacy/GDPR issues, ads, and UX hijacking from third-party embeds like YouTube.
- **Carousel:** Show a thumbnail with a play icon overlay. Tapping opens the gallery at that video.
- **Gallery:** Full video player replaces the static image, similar to how 360 photos use Pannellum. Pause the audio guide while video is playing, resume on close/navigate.
- **Admin:** Accept video file uploads (mp4, webm) alongside images. Videos would need a poster/thumbnail — either auto-generated or manually uploaded.
- **Phase 2 (optional):** Add YouTube/Vimeo embed support as an alternative to self-hosted files, with a URL field instead of file upload. Consider privacy implications (Google trackers, GDPR) and that embeds bring their own controls, ads, and "watch on YouTube" links.
- **Challenges:** Video file sizes (storage/bandwidth), mobile data usage on poor museum WiFi, managing two audio sources (video + audio guide), autoplay restrictions on mobile.
- **Scope:** 2-3 sessions

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

### WYSIWYG Editor for About Page
Replace the raw HTML textarea in the admin set form with a rich text editor supporting paragraphs, bold/italic/underline, and links.
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
- **Sanitize About page innerHTML with DOMPurify:** The About page injects raw HTML from the database with no sanitization — XSS vulnerability if an admin account is compromised. Add DOMPurify (~7KB) to sanitize with a strict allowlist (p, b, i, u, a, br, strong, em).
- **Split app.js into ES modules:** The visitor app is ~2500 lines in a single file. Split into modules (audio, map, gallery, scanner, carousel, routing) using ES `import`/`export` — no build step needed since `type="module"` is already declared.
- **Admin UI tooltips and help text:** The admin has accumulated many options (languages, media types, floor management, sequential nav, show numbers, colors, fonts, etc.). Add tooltips or info icons next to each setting that explain what it does. Consider a small `(?)` icon that shows a popover on hover/tap.
- **Admin UI/UX overhaul:** Review the overall admin workflow and layout. The current single-page form approach works but could be improved — consider better grouping of related settings, a more intuitive navigation flow between sets/objects/images, clearer visual hierarchy, and a more polished look. Worth doing a dedicated design pass.
- **Bug: New objects missing from map when floor not explicitly selected.** When creating a new object, if the user sets map coordinates but doesn't click a floor button, the object appears in the list view but not on the map. This is especially confusing when the set has only one floor — the user wouldn't think to select a floor at all. Possible fixes: auto-assign the first (or only) floor when the object is created, or show a validation warning when map coordinates are set but no floor is selected.
- **Translation completeness indicator:** Show in the admin UI which fields are missing translations for each language. Per set: highlight languages that are missing names/descriptions/about. Per object: show which languages lack a name, audio, or subtitles. Per image: indicate which languages are missing captions. Could be a simple color-coded badge or progress bar per language in the set/object/image list views.
- **Image focus point:** Allow setting a focal point (x%, y%) per image in the admin, used as the `object-position` for CSS `object-fit: cover` cropping in the carousel and thumbnails. Currently images get center-cropped which sometimes cuts off the important part. Admin UI: click on the image to set the focus point. Visitor: apply as inline `object-position` style.
- **Multi-set navigation:** Allow visitors to browse between sets if a museum has multiple exhibitions. Add an exit button (exit-door icon) in the top-right header, only visible in list and map views. Tapping it shows a confirmation dialog ("Are you sure you want to leave this exhibition?" with a "Leave exhibition" confirm button) before navigating to the welcome/exhibition list page. Hidden entirely when only one exhibition exists. Use the existing `btn btn--icon` style to keep it subtle. Consider header space at large font sizes with long exhibition names. After confirming, move focus to the welcome page heading for screen reader accessibility.
