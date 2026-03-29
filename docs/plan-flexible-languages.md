# Flexible Language System — Implementation Plan

## Overview

Replace the hardcoded Swedish/English system with a dynamic language configuration where each set defines which languages its content is available in. This makes Augus usable by museums worldwide, not just bilingual Swedish/English ones.

## Current State

- Two languages hardcoded everywhere: `en` and `sv`
- Database fields: `name_en`, `name_sv`, `description_en`, `description_sv`, `audio_en`, `audio_sv`, `subtitles_en`, `subtitles_sv`, `caption_en`, `caption_sv`
- UI i18n also hardcoded to en/sv
- Settings panel shows two language buttons: English / Svenska

## Target State

- A set defines its available content languages (e.g., `["en", "sv", "de", "fr"]`)
- A set defines its default content language (e.g., `"en"`)
- Each object stores content keyed by language code in a flexible structure
- The visitor UI shows only the languages available for the current set
- The admin UI dynamically generates fields based on the set's language configuration
- UI translations (button labels, etc.) remain a separate concern from content languages

## Important Distinction

**Content languages** vs **UI languages**:
- **Content languages**: The languages the museum content is available in (audio, subtitles, names). Configured per set.
- **UI languages**: The language of the app's interface (buttons, labels, settings). Currently en/sv, could be extended independently.

These are related but separate. A German museum might have content in `de` and `en`, but the app UI might still be in `en` (with `de` added later to UI translations).

## Database Schema Changes

### Option A: JSON Fields (Recommended)

Replace individual language columns with JSON fields:

```
objects:
  name: JSON          // {"en": "Viking Sword", "sv": "Vikingasvärd", "de": "Wikingerschwert"}
  audio: JSON/files   // Problem: PocketBase file fields can't be JSON-keyed
  subtitles: JSON     // Same problem
```

**Problem**: PocketBase doesn't support JSON-keyed file fields. Audio and subtitle files need a different approach.

### Option B: Separate Content Table (More Flexible)

Create an `object_content` collection that stores per-language content:

```
object_content:
  object: relation -> objects
  language: text ("en", "sv", "de", ...)
  name: text
  description: editor
  audio: file (MP3, max 50MB)
  subtitles: file (VTT, max 1MB)

  // Unique index on (object, language)
```

Similarly for image captions:
```
image_content:
  image: relation -> object_images
  language: text
  caption: text
```

And for set names/descriptions:
```
set_content:
  set: relation -> sets
  language: text
  name: text
  description: editor
```

**Pros**: Clean relational model, works perfectly with PocketBase file fields, easy to add/remove languages
**Cons**: More API calls (need to join content), more complex admin UI

### Option C: Hybrid (Pragmatic)

Keep text fields as JSON, handle files separately:

```
objects:
  names: JSON          // {"en": "Viking Sword", "sv": "Vikingasvärd"}
  sort_order: number
  slug: text
  default_language: text
  map_x, map_y: number

object_audio:
  object: relation -> objects
  language: text ("en", "sv", ...)
  audio: file
  subtitles: file
  // Unique index on (object, language)
```

### Recommendation: Option B

Option B is the cleanest for PocketBase. It treats all content uniformly and the extra API calls are manageable with `expand` or batch fetching.

### Sets Schema Changes

Add to sets collection:
```
available_languages: JSON    // ["en", "sv", "de"]
default_language: text       // "en"
```

## Admin UI Changes

### Set Form
- Replace the hardcoded "English" / "Svenska" fieldsets with:
  - A "Languages" section where you can add/remove language codes
  - A dropdown for default language (from available languages)
- When languages change, the object forms adapt dynamically

### Object Form
- Instead of fixed English/Svenska fieldsets, generate one fieldset per language defined in the set
- Each fieldset has: Name, Audio (MP3), Subtitles (VTT)
- The fieldset header shows the language name (from a lookup table: "en" -> "English", "de" -> "Deutsch")
- Fieldsets are collapsible (already implemented)

### Language Name Lookup
Maintain a simple map for display names:
```javascript
const languageNames = {
  en: "English", sv: "Svenska", de: "Deutsch",
  fr: "Français", es: "Español", it: "Italiano",
  nl: "Nederlands", da: "Dansk", no: "Norsk",
  fi: "Suomi", pt: "Português", zh: "中文",
  ja: "日本語", ko: "한국어", ar: "العربية",
  // ... extensible
};
```

## Visitor UI Changes

### Settings Panel
- Language selector shows only the languages available for the current set
- If the set has only one language, the language selector is hidden
- If the user's browser language matches an available language, auto-select it

### Content Loading
- Fetch content in the user's selected language
- Fall back to the set's default language if content is missing
- Fall back to any available language if default is also missing

### Object Page
- Load audio/subtitles for the selected language
- If unavailable, show a message: "Audio not available in [language]. Playing in [fallback language]."

## Migration Strategy

### Phase 1: Add New Schema (Non-Breaking)
1. Create new `object_content`, `set_content`, `image_content` collections
2. Add `available_languages` and `default_language` to sets
3. Write a migration script that copies existing `_en` and `_sv` data into the new content tables
4. Keep old `_en`/`_sv` fields intact (backwards compatible)

### Phase 2: Update Admin UI
1. Update admin to read/write from new content tables
2. Add language management to set form
3. Generate dynamic fieldsets in object form
4. Test thoroughly

### Phase 3: Update Visitor App
1. Update visitor to read from new content tables
2. Update settings panel to show dynamic language list
3. Update all content rendering (names, audio, subtitles, captions)

### Phase 4: Remove Old Fields
1. Once everything works, remove the `_en`/`_sv` columns
2. Clean up migration files

## Challenges & Trade-offs

1. **API complexity**: More collections = more API calls. Mitigate with PocketBase's `expand` feature or batch loading.
2. **Admin UX**: Dynamic forms are harder to build than static ones. Need to handle adding/removing languages gracefully.
3. **Partial translations**: What if an object has audio in English but not German? Need clear fallback logic and admin indicators showing translation completeness.
4. **Image captions**: Currently simple text fields. With dynamic languages, each image needs captions in each language — increases content entry burden.
5. **Performance**: Loading content from multiple tables. Cache aggressively on the client.
6. **Set-level vs global languages**: Each set has its own language set. A museum with multiple sets might want some global configuration. Start simple (per-set), extend later if needed.
7. **Right-to-left languages**: Arabic, Hebrew need RTL layout support. Not urgent but worth noting.

## Estimated Scope

This is a significant refactor touching every part of the system:
- Schema + migrations: 1 session
- Admin UI: 2-3 sessions
- Visitor UI: 1-2 sessions
- Testing + migration script: 1 session
- **Total: 5-7 sessions**

Recommend doing this as a dedicated effort, not mixed with other features.
