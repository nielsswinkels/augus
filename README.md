# Augus

A mobile-first web audioguide system for museums and exhibitions. Visitors scan QR codes on display objects to hear narrated audio descriptions with synced subtitles, browse image galleries, and navigate between exhibits. All content is managed through a simple admin interface.

## Features

- **QR code navigation** — scan a code to jump straight to an exhibit
- **Synced subtitles** — transcript text highlights in real time as the audio plays
- **Image gallery** — swipeable full-screen images with captions
- **Object list & map view** — browse all items or find them on a zoomable floor plan
- **Language support** — English and Swedish audio tracks with automatic fallback
- **Accessibility** — WCAG 2.1 AA, large touch targets, screen reader compatible
- **Lock-screen playback** — audio continues when the phone screen turns off

---

## Installation & Running

### Requirements

- Windows, macOS, or Linux
- No dependencies — PocketBase is a single self-contained binary

### Steps

1. **Download PocketBase** from [pocketbase.io](https://pocketbase.io) and place `pocketbase.exe` (or `pocketbase` on Mac/Linux) in the project root.

2. **Run the server:**
   ```
   ./pocketbase.exe serve --http=127.0.0.1:8090
   ```
   On first run this creates the `pb_data/` directory and starts the server.

3. **Run the database migration** to create the collections:
   ```
   ./pocketbase.exe migrate up
   ```

4. **Create a superuser account** (first time only):
   ```
   ./pocketbase.exe superuser create admin@example.com yourpassword
   ```

5. Open [http://127.0.0.1:8090](http://127.0.0.1:8090) in your browser.

> For production, replace `127.0.0.1:8090` with your domain and set up a reverse proxy (e.g. Caddy or nginx) with HTTPS.

---

## Admin Usage

Go to [http://127.0.0.1:8090/admin/](http://127.0.0.1:8090/admin/) and log in with your superuser credentials.

### Managing Sets (Exhibitions)

A **set** is a named collection of objects (e.g. an exhibition or a tour).

1. Click **New set** and fill in:
   - **Slug** — short URL-safe identifier, e.g. `summer-exhibition` (used in QR code URLs)
   - **Name** in English and Swedish
   - **Description** (optional) in English and Swedish
   - **Map image** (optional) — a PNG or JPG floor plan of the exhibition space
2. Save. The set appears in the list.

### Managing Objects

An **object** is a single exhibit within a set.

1. Select a set, then click **New object**.
2. Fill in:
   - **Slug** — e.g. `roman-vase` (used in QR code URLs)
   - **Sort order** — the number shown in the list and on the map (e.g. `1`, `2`, `3`)
   - **Default language** — the fallback audio language if the visitor's preferred language is unavailable
   - **Name** and **Description** in English and Swedish
   - **Audio** — upload an MP3 file per language (optional)
   - **Subtitles** — upload a WebVTT (`.vtt`) file per audio track (optional)
   - **Map position** — X% and Y% coordinates on the set's map image (only relevant if the set has a map)
3. Under **Images**, upload one or more photos. The first image becomes the thumbnail. Add captions per language. Use the sort order fields to reorder.
4. Save.

### QR Codes

- Open an object in the admin, then click **QR Code**.
- A QR code linking to that object's page is shown. Click **Download** to save it as a PNG for printing.

### Previewing

- Click **Preview** on any object to open the visitor view in a new browser tab.

---

## Visitor Usage

### Scanning a QR Code

Point the camera at the QR code on the exhibit label. The app opens directly to that object's audio guide page. If autoplay is enabled, the audio starts immediately.

### Object Page

- The **thumbnail image** is shown at the top — tap it to open the full image gallery.
- The **subtitle area** shows the transcript, with the current sentence highlighted as the audio plays.
- The **audio player** at the bottom lets you play/pause and skip ±15 seconds.

### Image Gallery

- Swipe left/right or use the arrow buttons to browse images.
- Each image shows its caption.
- Close the gallery to return to the audio guide.

### List View

Tap the **list icon** (top right) to see all objects in the current exhibition, numbered in order. Tap any item to jump to it.

If a map has been set up for the exhibition, a **map icon** appears in the list header. The map shows numbered pins — tap a pin to navigate to that object.

### QR Scanner

Tap the **QR icon** in the header to open the camera scanner and scan the next exhibit's code.

### Settings

Tap the **gear icon** to open settings:

| Setting | Options | Default |
|---|---|---|
| Autoplay audio | On / Off | On |
| Language | English / Svenska | English |
| Font size | Normal / Large / Extra large | Normal |
| Read captions aloud | On / Off | Off |

Settings are saved automatically and remembered between visits.
