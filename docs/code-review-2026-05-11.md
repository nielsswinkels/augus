# Augus — Code & Architecture Review

**Date:** 2026-05-11

A comprehensive review of the Augus codebase covering the visitor frontend, admin frontend, data model, and migrations. Reviewed by three independent analysis passes covering code quality, architecture, maintainability, security, performance, and accessibility.

---

## What's Done Well

The codebase is well-crafted for a no-build vanilla JS app. Several things stand out as strong choices:

- **XSS protection** — `esc()` / `escapeHtml()` used consistently across both frontends when rendering user data in template literals and innerHTML assignments.
- **Accessibility foundation** — ARIA labels on all interactive elements, `aria-live="polite"` on subtitle area, focus trapping in gallery and settings modals, `role="dialog"` + `aria-modal` on overlays, `:focus-visible` styling, `prefers-reduced-motion` support, and 48px minimum touch targets throughout.
- **Auth handling** — `sessionStorage` (not `localStorage`) limits token exposure to a single browser tab. JWT expiry is checked on init via `isTokenExpired()`. The `api()` helper auto-logs-out on 401/403 responses. Custom `Authorization` header provides implicit CSRF protection since cross-origin form submissions cannot set custom headers.
- **i18n** — simple, self-contained bilingual system with a clean `t()` helper function. No external dependency needed.
- **Lazy loading** — Pannellum (360° viewer), Leaflet (outdoor maps), and jsQR (scanner) are only downloaded when the visitor actually uses those features. This keeps the initial page load fast.
- **Media Session API** — lock-screen playback controls on mobile are a thoughtful touch for an audioguide app where visitors pocket their phone while listening.
- **Color theming** — automatic contrast calculation for custom exhibition colors is well-engineered, ensuring text remains readable regardless of admin color choices.
- **WebVTT parser** — the subtitle parser correctly handles optional hour fields and edge cases.
- **Migrations** — all 14 migrations provide both up and down functions (reversible). Down migrations use defensive `if (field)` checks before removal. Fields are added incrementally rather than rebuilding collections.
- **Admin UX polish** — dirty-state tracking with `beforeunload` guard, two-click delete confirmation with auto-reset timeout, form validation that expands collapsed fieldsets and scrolls to the first invalid field.

---

## Critical Issues

### 1. XSS via About page content

**Location:** `app.js`, `renderAboutContent` function

The About page content is injected with `dom.aboutContent.innerHTML = content` using raw HTML from the `about_en`/`about_sv` database fields with zero sanitization. If an admin account is compromised or a malicious API response is served, arbitrary scripts can execute in every visitor's browser.

**Fix:** Use DOMPurify (a ~7KB library) to sanitize the HTML before injection, or escape the HTML entirely if rich formatting isn't needed. Since the About page intentionally supports basic HTML formatting (bold, links, etc.), DOMPurify with a strict allowlist is the right approach:
```js
dom.aboutContent.innerHTML = DOMPurify.sanitize(content, {
  ALLOWED_TAGS: ['p', 'b', 'i', 'u', 'a', 'br', 'strong', 'em'],
  ALLOWED_ATTR: ['href', 'target']
});
```

**Effort:** 30 minutes

### 2. API write rules too permissive

**Location:** `pb_migrations/1711500000_create_collections.js`

All four collections (`sets`, `objects`, `object_images`, `floors`) use `@request.auth.id != ''` for create/update/delete rules. This means any authenticated PocketBase user — not just admins — can modify any record in any collection. This is only safe if PocketBase user self-registration is disabled in the admin settings.

If self-registration is enabled (the PocketBase default), anyone could create an account and then create, modify, or delete any exhibition content.

**Fix:** Either verify that PocketBase self-registration is disabled in the admin settings panel, or add ownership checks to the API rules, or restrict write rules to only allow superusers/admins.

**Effort:** 5 minutes to verify, 30 minutes to add ownership rules if needed

---

## Security Concerns

### PocketBase filter injection

**Location:** `app.js`, `loadRoute` function (around line 459)

The set slug from the URL hash is interpolated directly into PocketBase filter strings like `filter=(slug='${setSlug}')`. Although `encodeURIComponent` is used on parts of the URL, PocketBase's filter syntax could potentially be exploited depending on how the backend's parser handles special characters. Parameterized filters or strict slug validation (only allowing `[a-z0-9-]`) before interpolation would be safer.

### Font URL injection

**Location:** `app.js`, custom font loading (around line 2306)

The font file URL is interpolated into a `<style>` block via template literal with no escaping. If a malicious filename were stored in the database (e.g., containing CSS escape sequences), this could be a CSS injection vector. Low risk since only admins can set fonts, but worth sanitizing.

### Admin dual-endpoint login

**Location:** `admin.js`, `login()` function (line 71)

The login function tries two PocketBase auth endpoints sequentially (legacy admin endpoint, then superuser collection). This leaks timing information about which endpoint exists and is valid. An attacker could determine the PocketBase version and auth configuration from response timing.

---

## Performance Concerns

### N+1 thumbnail loading

**Location:** `app.js`, `loadListThumbnails` function (around lines 1242-1263)

The list view fires one separate API request per object to load its first image. For a set with 50 objects, this means 50 concurrent HTTP requests. On museum WiFi this can be slow and creates unnecessary server load.

**Fix:** Batch into a single API call using PocketBase's filter syntax, e.g. `filter=(object='id1'||object='id2'||...)&sort=sort_order&fields=id,object,image`, or preload thumbnails when loading the object list.

**Effort:** 1 hour

### List view re-rendered on every view switch

**Location:** `app.js`, view switching logic (around lines 2004, 2052)

Every time the visitor switches to the list view, the entire list DOM is rebuilt from scratch and all thumbnail requests are re-fired, even when the underlying data hasn't changed. The list should be cached and only re-rendered when the set data actually changes.

### Subtitle highlighting on every timeupdate tick

**Location:** `app.js`, `updateSubtitleHighlight` (called from `timeupdate` event, around line 811)

The `timeupdate` event fires roughly 4 times per second. Each time, it queries all `.subtitle-cue` elements and calls `scrollIntoView`. For long transcripts with many cues, this is unnecessarily expensive. A binary search on sorted cue timestamps plus only scrolling when the active cue actually changes would be more efficient.

### Admin auto-fixes sort_order on every load

**Location:** `admin.js`, `loadObjects` function (lines 347-374)

When loading the object list, the admin detects gaps in sort_order numbering and silently issues N PATCH requests to fix them. This is a read operation with write side effects. It should either be an explicit admin action ("Renumber objects") or handled server-side.

### Admin reorder updates all objects

**Location:** `admin.js`, object drag-drop reorder handler (line 458)

When reordering a single object, the handler updates the sort_order of *all* objects in the set via `Promise.all`, not just the moved item and its neighbors. For large sets this creates unnecessary API load.

---

## Architecture & Maintainability

### Single-file approach reaching its limit

`app.js` is ~2400 lines and `admin.js` is ~1700 lines. Both are manageable today but approaching the threshold where splitting into modules would significantly improve maintainability. Since the visitor HTML already declares `type="module"` on the script tag, splitting into ES module imports (e.g., `audio.js`, `map.js`, `gallery.js`, `scanner.js`, `routing.js`) requires no build step — just `import`/`export` statements.

### Monkey-patched renderGalleryImage

**Location:** `app.js`, `setupGalleryEvents` (lines 1117-1121)

`renderGalleryImage` is reassigned at runtime to wrap zoom-reset logic:
```js
const origRender = renderGalleryImage;
renderGalleryImage = function() {
  resetGalleryZoom();
  origRender();
};
```
This is fragile and makes the code harder to follow. A dedicated `showGallerySlide` function that explicitly calls both `resetGalleryZoom` and `renderGalleryImage` would be clearer.

### Admin form population is repetitive

**Location:** `admin.js`, `editSet()` and `editObject()` functions

Both functions manually set 15-20+ form fields with repetitive `$(...).value = ...` lines. A data-driven approach using a field mapping array would eliminate duplication and prevent fields from being missed when adding new ones.

### Admin dual-request saves

**Location:** `admin.js`, `saveSet` and `saveObject` functions

Both make two sequential API calls: a FormData PATCH for file uploads, then a JSON PATCH for boolean fields (because booleans are unreliable in FormData). If the second call fails, the record is left in an inconsistent state. These should be combined into a single request where possible, or wrapped in error recovery that notifies the admin.

### perPage=200 silent truncation

**Location:** `admin.js`, throughout all list-loading functions

All API calls use `perPage=200`. Sets with more than 200 objects will silently truncate the list with no pagination UI or warning. This is unlikely for a museum audioguide today but is a latent bug.

---

## Data Model Issues

### Hardcoded language columns

All collections use `_en` and `_sv` suffixed columns (e.g., `name_en`, `name_sv`, `caption_en`, `caption_sv`). Adding a third language requires a migration touching every table. A separate translations table keyed on `(entity_id, locale)` would scale better, but this is acceptable for a two-language product and is already noted in future plans as "Flexible Language System."

### default_floor is plain text, not a relation

**Location:** `pb_migrations/1711500010_add_floors.js`

The `sets.default_floor` field is a plain text field storing a floor ID, not a proper PocketBase relation. This means there's no referential integrity — a floor can be deleted while `default_floor` still references it, leading to a dangling reference. Should be a `RelationField`.

### floors.type has no default value

**Location:** `pb_migrations/1711500013_add_outdoor_maps.js`

The `floors.type` select field (values: "indoor", "outdoor") was added without a default value. Existing floor records created before this migration have a null type. The app must implicitly treat null as "indoor", which is undocumented and error-prone.

### Missing database indexes

- **No index on `objects.floor`** — querying all objects for a given floor requires a table scan.
- **No index on `objects.published` or `sets.published`** — the most common visitor query (published objects sorted by order) has no index support. A composite index like `(set, published, sort_order)` would help.
- **No unique constraint on `(set, label)` for floors** — two floors in the same set could share the same label.

### Field validation gaps

- **`color_primary` / `color_accent`**: plain text with no pattern or maxLength. Should validate hex format (`^#[0-9a-fA-F]{6}$`).
- **`subtitle_font`**: no maxLength set.
- **`latitude` / `longitude`**: no min/max bounds (should be -90..90 and -180..180).
- **Editor fields** (`description_en`, `about_en`, etc.): no maxLength, could store arbitrarily large content.

---

## Accessibility Gaps

### Carousel lacks proper ARIA semantics

**Location:** `app.js`, `renderCarousel` (line 726-731)

Carousel dots are created as `<button>` elements with `aria-label` but lack `role="tab"` / `role="tablist"` grouping. The carousel track lacks `role="tabpanel"`. This makes the carousel navigation opaque to screen readers.

### No skip-to-content link

There is no skip-to-content link for keyboard users to bypass the header and navigation and jump directly to the main content.

### Subtitle live region may not announce changes

**Location:** `index.html`, subtitles area (line 41)

The subtitle area has `aria-live="polite"` but subtitle cue transitions are done via CSS class toggling (adding/removing `.active`), not content changes. Most screen readers only announce live region changes when the text content changes, so cue transitions may go unannounced.

### Gallery generic alt text

When a gallery image has no caption, the alt text falls back to "Image N" which is acceptable but generic. A more descriptive fallback including the object name would be better for screen reader users.

---

## Minor Issues

- **Playback speed not persisted** — `speedIndex` is a closure variable inside `setupAudioEvents` that resets on `loadedmetadata`. If a user sets 1.5x speed, navigates to another object, and returns, the speed resets to 1x. Should be persisted in settings.
- **Route load race condition** — if `loadRoute` is called while a previous call is still awaiting (e.g., rapid hash changes), both run concurrently with no cancellation. This could leave the UI showing the wrong object. An `AbortController` or generation counter would fix this.
- **GPS watch not stopped on set change** — `stopGpsTracking` is called when navigating to the welcome page, but switching from an outdoor set to an indoor-only set does not stop the watch, continuing to drain battery.
- **`$` and `$$` helper names** shadow jQuery conventions, which could confuse contributors expecting jQuery behavior.
- **`mapImage.onload` reassignment** — uses direct property assignment instead of `addEventListener`, inconsistent with the rest of the code.
- **Admin QR modal** has no Escape-key handler or click-outside-to-close.
- **Admin inline `onclick` handlers** on `<legend>` elements mix event handling styles with the otherwise consistent `addEventListener` approach.
- **Admin `.btn--small:hover`** CSS rule is empty (dead rule).
- **Admin `.hidden { display: none !important; }`** — the `!important` flag is fragile and makes debugging visibility issues harder.
- **Migration numbering gap** — migration `0011` is skipped, suggesting a deleted migration. Harmless but noted.

---

## Priority Recommendations

| Priority | Item | Effort | Section | Status |
|----------|------|--------|---------|--------|
| **P0** | Sanitize About page innerHTML with DOMPurify | 30 min | Critical #1 | Open |
| **P0** | Verify PocketBase self-registration is disabled | 5 min | Critical #2 | ✅ Done — only `_superusers` used, `users` collection empty |
| **P1** | Batch thumbnail loading into single API call | 1 hour | Performance | ✅ Done |
| **P1** | Add missing database indexes (floor, published) | 30 min | Data Model | Open |
| **P1** | Fix default_floor to be a proper relation | 30 min | Data Model | Open |
| **P2** | Add route-load cancellation (AbortController) | 1 hour | Minor Issues | Open |
| **P2** | Split app.js into ES modules | 2-3 hours | Architecture | Open |
| **P2** | Add field validation (colors, lat/lng, lengths) | 1 hour | Data Model | Open |
| **P3** | Carousel ARIA tab semantics | 30 min | Accessibility | Open |
| **P3** | Add skip-to-content link | 15 min | Accessibility | Open |
| **P3** | Persist playback speed preference | 15 min | Minor Issues | Open |
| **P3** | Stop GPS watch on indoor set switch | 15 min | Minor Issues | Open |
