# Augus — Future Work & Ideas

A collection of planned features, improvements, and ideas for future development sessions.

## Planned (with implementation plans)

### Blind User / Accessibility Mode
Full accessibility mode for blind and low-vision visitors. Continuous QR scanning, auto-play, gesture navigation, TTS feedback.
- **Plan:** `docs/plan-blind-user-mode.md`
- **Scope:** 4-7 sessions across 3 phases

### ~~Flexible Language System~~ ✅ Done
Replaced hardcoded Swedish/English with content tables (`set_content`, `object_content`, `image_content`, `floor_content`). Per-set language configuration via `available_languages` JSON field. Dynamic admin forms and visitor language selector.
- **Plan:** `docs/plan-flexible-languages.md`

### Object Groupings (#2)
Group multiple objects together within a set. Groups have a title and sort order. In list view, grouped objects are visually enclosed with a border and group title header. No impact on map view, no nested groups.
- **Design:** Groups collection with `title_en`, `title_sv`, `sort_order`, relation to set. Objects get a nullable `group` relation. Objects within a group have their own sort_order for internal ordering.
- **Admin:** Dropdown on object form to assign to group. Drag-to-reorder groups and objects within groups.
- **Scope:** 1-2 sessions

---

## Ideas (need design work)

### ~~3D Model Support in Gallery & Carousel~~ ✅ Done
Implemented using Google's model-viewer web component (~400KB, MIT, lazy-loaded). Replaced `is_360` boolean with `media_type` select field (image/360/3d). Admin has media type dropdown and .glb file upload. Carousel shows 3D cube icon. Gallery renders interactive model-viewer with camera controls, auto-rotate, shadows, and AR support on compatible devices.

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
- **Bug: New objects missing from map when floor not explicitly selected.** When creating a new object, if the user sets map coordinates but doesn't click a floor button, the object appears in the list view but not on the map. This is especially confusing when the set has only one floor — the user wouldn't think to select a floor at all. Possible fixes: auto-assign the first (or only) floor when the object is created, or show a validation warning when map coordinates are set but no floor is selected.
- ~~**Localized floor labels:**~~ ✅ Done — `floor_content` table with per-language label and name.
- **Translation completeness indicator:** Show in the admin UI which fields are missing translations for each language. Per set: highlight languages that are missing names/descriptions/about. Per object: show which languages lack a name, audio, or subtitles. Per image: indicate which languages are missing captions. Could be a simple color-coded badge or progress bar per language in the set/object/image list views.
- **Image focus point:** Allow setting a focal point (x%, y%) per image in the admin, used as the `object-position` for CSS `object-fit: cover` cropping in the carousel and thumbnails. Currently images get center-cropped which sometimes cuts off the important part. Admin UI: click on the image to set the focus point. Visitor: apply as inline `object-position` style.
- ~~**Thumbnail image sizes:**~~ ✅ Done — using PocketBase `?thumb=` params (128x128 for list, 600x400 for carousel).
- **Multi-set navigation:** Allow visitors to browse between sets if a museum has multiple exhibitions. Add an exit button (exit-door icon) in the top-right header, only visible in list and map views. Tapping it shows a confirmation dialog ("Are you sure you want to leave this exhibition?" with a "Leave exhibition" confirm button) before navigating to the welcome/exhibition list page. Hidden entirely when only one exhibition exists. Use the existing `btn btn--icon` style to keep it subtle. Consider header space at large font sizes with long exhibition names. After confirming, move focus to the welcome page heading for screen reader accessibility.
