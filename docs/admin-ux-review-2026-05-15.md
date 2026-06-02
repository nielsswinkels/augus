# Augus Admin Interface — UX Review

**Date:** 2026-05-15

## Executive Summary

The Augus admin is a focused, single-purpose CMS for managing museum audioguides. Its core structure (Sets → Objects → Images) maps cleanly to the museum domain. However, the set form packs too many disparate concerns into one long page, the two-tab navigation creates friction when switching between a set's configuration and its objects, and several interaction patterns (group management, image editing, floor configuration) rely on non-standard controls that a non-technical museum employee would struggle to discover without training.

---

## Current Strengths

1. **Domain-appropriate vocabulary.** "Sets" and "Objects" are clear labels for exhibitions and artworks. Slugs auto-generate from names, removing a common CMS stumbling block.

2. **Good guard rails.** Unsaved-change warnings, double-click delete confirmation with auto-reset timeout, validation that auto-expands collapsed fieldsets, and reserved-slug checking all prevent data loss and misconfiguration.

3. **Multilingual content is first-class.** Dynamic language management with add/remove tags, per-language content fieldsets, and the collapse/expand pattern for each language keeps things workable even with 5+ languages.

4. **Sensible defaults.** New objects default to published, sort order auto-increments, slugs auto-generate, and the first floor is auto-created. This reduces the number of decisions for a new user.

5. **Useful utilities.** QR code generation, object preview, and duplicate are all present and easily accessible from the object form header. The toast notification system gives clear feedback.

---

## Key Pain Points (Prioritized)

### P1 — The set form is a wall of settings

Slug, languages, per-language content (name/description/about with Quill), logo, map/floors, colour scheme (2 pickers + 2 text inputs), custom font upload, subtitle font dropdown, sequential nav toggle, show numbers toggle, branding toggle, and published toggle all live on one scrolling page. A first-time user opening this form will feel overwhelmed before they type a single character. By comparison, WordPress splits equivalent settings across 4-5 distinct screens.

### P2 — Navigation between Set and Objects is disjointed

Editing a set happens in the Sets tab; viewing/editing its objects happens in the Objects tab via a separate dropdown filter. The "Objects →" button on the set form is the only bridge, and it is hidden until the set is saved. A user who just created a set and saved it must either spot that button or manually switch tabs and re-select the set from the dropdown. This is non-obvious.

### P3 — Group management is hard to discover

Groups appear as special cards in the object list with small "Edit" and "Delete" buttons. Clicking "Edit" toggles an inline form that expands within the card. There is no visual cue that groups exist, how to assign objects to them, or that drag-and-drop onto a group header is supported. The interaction pattern is unique to this interface and undocumented.

### P4 — Image editing is cramped

The image grid uses 150px-minimum cards. Clicking "Edit" on a card reveals per-language caption inputs, a media-type dropdown, and (for video) subtitle upload fields — all inside a ~160px-wide card. On a typical screen this is unusable without horizontal scrolling or very short captions. The edit-in-place pattern also means users cannot compare captions across images.

### P5 — Floor configuration is nested too deeply

Floors are inside a collapsible fieldset inside the set form. Each floor has its own label/name fields per language, a map-image upload or Leaflet preview, move-up/move-down buttons, a per-floor Save button, and a Delete button. This is a form-within-a-form pattern that breaks the user's mental model of "fill in fields, press Save at the bottom."

### P6 — No feedback on what is published

The object list shows a small red "DRAFT" badge, but there is no bulk-publish workflow, no at-a-glance summary ("3 of 12 objects published"), and no visual distinction between sets that are ready to go live and those that are incomplete.

---

## Specific Recommendations

### R1 — Split the set form into tabbed sections

Replace the single long form with 3-4 horizontal sub-tabs inside the set editing panel: "Content" (languages, name, description, about), "Appearance" (colours, fonts, logo), "Map" (floors), and "Settings" (sequential nav, show numbers, branding, published). Each sub-tab would have its own Save button. This pattern is standard in WordPress "Customizer" and Squarespace "Design" panels. It reduces cognitive load per screen from ~15 fields to ~4.

### R2 — Make objects accessible from within the set context

When editing a set, add an "Objects" sub-tab alongside the set's own sub-tabs. This sub-tab would show the same object list currently on the Objects tab, but pre-filtered to this set and without the dropdown. This eliminates the two-step tab-switch-then-filter workflow. The top-level "Objects" tab can remain as a shortcut.

### R3 — Replace inline group editing with a modal or slide-out panel

When the user clicks "Edit" on a group header, show a small modal with title fields per language and a colour picker. This gives the fields room to breathe and matches the pattern users expect from editing a distinct entity. Add a short help text: "Drag objects onto a group header to add them, or use the Group dropdown in the object form."

### R4 — Use a list/table layout for image management

Replace the grid with a vertical list where each row shows a thumbnail (small, left-aligned), per-language caption inputs (always visible, inline), media type badge, and reorder/delete controls. This layout works better for data entry and scales to any number of languages. The upload form can remain at the bottom.

### R5 — Add contextual help

The interface currently relies on `form-hint` text, which works for simple fields but is absent for concepts like "groups," "floors," or "sequential navigation." Add small `(?)` icons next to section headings that reveal a 1-2 sentence explanation on hover or click. For floors and groups, add a one-sentence prompt when the section is empty: "Floors let visitors switch between maps for different levels of your building."

---

## Quick Wins

1. **Move "Published" and "Delete" to the top of set and object forms.** Users checking or toggling publish status should not have to scroll to the very bottom. Place the Published toggle in the panel header bar, next to the title. Move Delete into a "..." overflow menu in the header.

2. **Add object count to the sets list.** Each set card should show "12 objects (10 published)" so the user can gauge completeness at a glance without clicking in.

3. **Auto-save floors on map-image upload.** Currently the user must upload a file and then also click the per-floor "Save" button. Since uploading a file is a clear intent to save, trigger the save automatically (or at least prompt).

4. **Widen image cards on edit.** When "Edit" is clicked on an image card, expand it to span the full grid width (or at least 2 columns) so caption fields are usable. Add `grid-column: 1 / -1` to the card in editing state.

5. **Show a "Getting started" checklist for new sets.** When a set has no objects, show a simple checklist: "1. Add languages. 2. Set a name and description. 3. Upload a map. 4. Add objects." This guides non-technical staff without requiring external documentation.

6. **Keyboard shortcut for Save.** Add `Ctrl+S` / `Cmd+S` to trigger the form submit. Museum staff who enter many objects will appreciate this.

7. **Improve the colour picker layout.** The labels "Primary" and "Background" are vague. Rename to "Accent colour (buttons, pins)" and "Background colour (page)." Show a small live preview swatch that combines both colours with sample text so users can judge contrast without saving.

---

## Bigger Redesign Suggestions

### Sidebar navigation

Replace the two top-level tabs with a persistent left sidebar listing all sets. Clicking a set reveals its sub-sections (Content, Appearance, Map, Objects) in a secondary nav. This pattern (used by Notion, Squarespace, and most CMS dashboards) eliminates the dropdown filter, makes the set-object relationship visible, and supports future features (analytics, visitor stats) without running out of tab space. On tablets, the sidebar can collapse to an icon rail.

### Batch operations

Add checkboxes to the object list so users can bulk-publish, bulk-unpublish, bulk-delete, or bulk-move-to-group. Museum staff preparing an exhibition launch should not have to open and save 30 objects individually to publish them.

### Drag-and-drop image upload

Replace the file-input form with a drop zone that accepts multiple files at once. Auto-assign incrementing sort orders. Show a progress bar per file. This is the interaction pattern every modern CMS uses and museum staff will expect it, especially when adding 10-20 images per object.

### Preview pane

Add a "Preview" toggle to the set form that shows a phone-sized iframe of the visitor-facing audioguide alongside the admin form. This lets staff see their colour, font, and content changes in real time without opening a new tab. Squarespace's live-preview pattern is the closest analogy.
