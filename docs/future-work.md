# Augus — Future Work & Ideas

A collection of planned features, improvements, and ideas for future development sessions.

## Planned (with implementation plans)

### Blind User / Accessibility Mode
Full accessibility mode for blind and low-vision visitors. Continuous QR scanning, auto-play, gesture navigation, TTS feedback.
- **Plan:** `docs/plan-blind-user-mode.md`
- **Scope:** 4-7 sessions across 3 phases

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
- **QR sign template generator:** Replace the basic QR code download with a full sign generator in the admin. Auto-generate printable signs for each object using configurable templates. See `docs/qr-sign-design-guide.md` for design principles and template ideas. Templates could include: Minimal (number + name + QR + headphone icon), Rich (number + name + teaser + QR + language flags), Wall label (traditional museum label format with QR). Batch export as PDF for all objects in a set.
- **Analytics:** Simple view/play counts per object (privacy-friendly, no tracking)
- **Split app.js into ES modules:** The visitor app is ~2500 lines in a single file. Split into modules (audio, map, gallery, scanner, carousel, routing) using ES `import`/`export` — no build step needed since `type="module"` is already declared.
- **Admin UI tooltips and help text:** The admin has accumulated many options (languages, media types, floor management, sequential nav, show numbers, colors, fonts, etc.). Add tooltips or info icons next to each setting that explain what it does. Consider a small `(?)` icon that shows a popover on hover/tap.
- **Admin UI/UX overhaul:** Review the overall admin workflow and layout. The current single-page form approach works but could be improved — consider better grouping of related settings, a more intuitive navigation flow between sets/objects/images, clearer visual hierarchy, and a more polished look. Worth doing a dedicated design pass.
- **Translation completeness indicator:** Show in the admin UI which fields are missing translations for each language. Per set: highlight languages that are missing names/descriptions/about. Per object: show which languages lack a name, audio, or subtitles. Per image: indicate which languages are missing captions. Could be a simple color-coded badge or progress bar per language in the set/object/image list views.
- **Image focus point:** Allow setting a focal point (x%, y%) per image in the admin, used as the `object-position` for CSS `object-fit: cover` cropping in the carousel and thumbnails. Currently images get center-cropped which sometimes cuts off the important part. Admin UI: click on the image to set the focus point. Visitor: apply as inline `object-position` style.
- **Multi-set navigation:** Allow visitors to browse between sets if a museum has multiple exhibitions. Add an exit button (exit-door icon) in the top-right header, only visible in list and map views. Tapping it shows a confirmation dialog ("Are you sure you want to leave this exhibition?" with a "Leave exhibition" confirm button) before navigating to the welcome/exhibition list page. Hidden entirely when only one exhibition exists. Use the existing `btn btn--icon` style to keep it subtle. Consider header space at large font sizes with long exhibition names. After confirming, move focus to the welcome page heading for screen reader accessibility.
- **Admin preview of unpublished content:** Allow admins to preview unpublished sets and objects in the visitor view. Currently the visitor app filters by `published=true`, so unpublished content is invisible even via the Preview button. Could use a URL parameter (e.g. `?preview=1`) combined with an auth check, or a separate preview mode that bypasses the published filter.
- **Large font size pass:** Review and fix the entire visitor UI at the largest font sizes (xl, xxl, xxxl). Some elements may overflow, overlap, or become unusable at very large sizes — header, bottom nav, audio player, carousel, map controls, settings panel, group headers, etc. all need testing and CSS adjustments.
- **Auto-advance audio tour mode:** A setting where the app automatically navigates to the next object and plays its audio when the current track finishes. Turns the exhibition into a hands-free continuous audio tour — visitors can keep the device in their pocket. Requires sequential navigation to be enabled. Should work with lock-screen playback (Media Session API already handles lock-screen controls; auto-advancing would need to trigger the next audio programmatically via the `ended` event). Open question: should there be a pause/delay between objects, or a chime/announcement like "Next: Object name"?
- **Bug: QR scanner camera rotated 90°?** The camera feed in scan mode may be rotated 90 degrees on some devices. Needs more testing across different phones/browsers to confirm. Could be a `getUserMedia` video constraints issue or a CSS transform problem.
- **Bug: QR scanner should auto-open camera.** If the user has already granted camera permission, scan mode should skip the "Start scanning" button and show the camera feed directly. May have been implemented before but could have regressed.
- **Fullscreen subtitle / karaoke mode:** A mode where the subtitle text takes up the full screen with large typography, similar to Spotify's fullscreen lyrics. Could be useful for visitors who want to read along without looking at a small subtitle area. Toggle via a button on the object page or an expand gesture on the subtitle area.
- **Landing page / marketing site:** Separate repo, likely a simple static site (GitHub Pages or similar). Target audience: museum staff evaluating audio guide solutions. Should include: what Augus is, screenshots/demo, feature list, self-hosting instructions, link to GitHub repo. The "Powered by Augus" footer links here. Keep it simple — one page is enough.
- **Onboarding / first-time experience:** When a visitor scans their first QR code, they land on an object page with no context. A brief "Welcome to [exhibition] — this is your audio guide" moment could help orient them. Could be a one-time overlay or splash screen, dismissed on first interaction.
- **Share button:** Let visitors share a specific object link with someone ("check out this artwork I saw today"). Use the Web Share API on mobile, fallback to copy-to-clipboard on desktop.
- **Favorites / bookmarks:** Let visitors mark objects to revisit later. Stored in localStorage. Show a bookmarks list in the nav or settings. Useful for large exhibitions.
- **Text transcript view:** Some visitors prefer reading a full text version rather than listening. The VTT subtitle content could be rendered as a readable article/paragraph, separate from the synced subtitle view.
- **Duplicate set:** Copy an entire exhibition (objects, images, content) as a starting point for a new one. Currently only individual objects can be duplicated.
- **Import/export:** Export a full set as a ZIP (JSON + media files), import on another Augus instance. Enables sharing exhibitions between institutions or migrating between servers.
- **Backup/restore:** The `pb_data` Docker volume has no backup strategy. A scheduled backup script or admin button to download a database dump would prevent data loss. Could use PocketBase's built-in backup API.
- **Image compression on upload:** Automatically resize/compress large images on upload before storage, rather than only relying on PocketBase's thumbnail generation for display. Would reduce storage and improve load times for the full-size gallery view.
- **Error monitoring:** If something breaks in production, nobody knows. A lightweight error reporter — even just logging JS errors to a PocketBase collection — would help catch issues.
- **Multi-admin accounts:** Currently one superuser. Multiple admin accounts with different permissions (e.g. "can edit this set but not that one") would matter for larger institutions with multiple curators.
- **Embeddable widget:** Let other websites embed a mini audio player for a specific object. Museums could put the audio guide directly on their website's collection page via an iframe or script tag.
- **Kiosk mode:** A dedicated display mode for a tablet mounted at an exhibit. Larger touch targets, no browser navigation, auto-return to the current object after idle, possibly locked to a single object or set.
- **Treasure hunt / discovery mode:** A per-set toggle that turns the exhibition into a scavenger hunt. Visitors discover objects by scanning their QR codes. Undiscovered objects appear as question marks in the list (no name, no image) and are not clickable. The map shows all pins but only discovered ones are tappable. List view shows a progress counter ("4 / 12 found"). Sequential navigation (prev/next) is disabled in this mode — discovery must happen through scanning. Discovered objects tracked in localStorage. Could include a completion celebration when all objects are found.

---

## Non-Code: Content, Testing & Outreach

### Content & Testing
- **Build a polished demo exhibition** — the test content doesn't showcase Augus's full capabilities. Create a demo with good audio, proper images, multiple languages, 360 photos, a 3D model, and groups. This becomes the calling card when showing it to museums.
- **Guerrilla user testing** — 3-5 people, 5 minutes each, just watch them use it. Follow the test script in the QR sign design guide. Do this before building more features.
- **Cross-device testing** — test on iPhone Safari (autoplay, gyroscope permissions), older Android phones, tablets, and different screen sizes. Known issues exist with QR scanner rotation on some devices.

### Outreach & Positioning
- **Find one real museum to pilot with** — a single real-world deployment teaches more than months of solo development. Offer it for free to a small local museum in exchange for feedback.
- **Document a case study** — even from the office installation. Photos of the signs, visitor reactions, what worked, what didn't. "We set up Augus for 5 exhibits, here's what happened."
- **Research Swedish museum audio guide landscape** — what do museums currently use? Spotify playlists? Expensive SaaS? Nothing? Understanding the competition helps articulate why Augus matters.
- **Write a blog post or LinkedIn article** — "I built a free open-source audioguide system, here's why." Museum tech people are active on LinkedIn. One post could find the first pilot museum.
- **Conference talk or demo** — Swedish museum conferences (Museernas Vårmöte) or cultural heritage tech meetups. Even a lightning talk gets visibility.

### Sustainability
- **Decide on a sustainability model** — if this grows, will there be paid hosting/support? Purely open source? The AGPL license ensures anyone who modifies it must share their changes.

### Design & Polish
- **Screenshots and a short video** — record a 60-second walkthrough of the visitor experience. Essential for the landing page and any outreach.
- **Refine the office QR signs** — apply the design guide principles (docs/qr-sign-design-guide.md). Replace "curious? scan here" with something compelling and measure if scan rates improve.

