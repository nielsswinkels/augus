# Augus

A free, self-hosted audioguide system for museums and exhibitions. Visitors scan QR codes to hear narrated audio, browse image galleries, and explore exhibits — all in their mobile browser, no app download needed.

## Features

- **QR code navigation** — scan a code to jump straight to an exhibit
- **Audio with synced subtitles** — transcript highlights in real time as audio plays
- **Image gallery** — swipeable full-screen images with captions, 360° panoramas, 3D models, and video
- **Multi-language** — any number of languages per exhibition, with dynamic UI translations for 18+ languages
- **Indoor & outdoor maps** — floor plans with clickable pins, or GPS-tracked outdoor maps with proximity-triggered audio
- **Object groupings** — organize exhibits into rooms or sections with optional color coding
- **Accessibility** — WCAG 2.1 AA, large font options, screen reader support, lock-screen playback
- **Self-hosted** — runs on a single PocketBase binary, your data stays on your server

---

## Quick Start (Local Development)

### Requirements

- Windows, macOS, or Linux
- No dependencies — PocketBase is a single self-contained binary

### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nielsswinkels/augus.git
   cd augus
   ```

2. **Download PocketBase** from [pocketbase.io/docs](https://pocketbase.io/docs/) — pick the binary for your OS and place it in the project root.

3. **Start the server:**
   ```bash
   ./pocketbase serve --http=127.0.0.1:8090
   ```
   On first run, PocketBase creates the `pb_data/` directory, runs all migrations automatically, and starts the server.

4. **Create an admin account** (first time only):
   ```bash
   ./pocketbase superuser create admin@example.com yourpassword
   ```

5. **Open in your browser:**
   - Visitor app: [http://127.0.0.1:8090](http://127.0.0.1:8090)
   - Admin panel: [http://127.0.0.1:8090/admin/](http://127.0.0.1:8090/admin/)

---

## Production Deployment (Docker)

### Requirements

- A Linux server (VPS) with Docker and Docker Compose
- A domain name pointing to the server

### Steps

1. **Clone and enter the project:**
   ```bash
   git clone https://github.com/nielsswinkels/augus.git
   cd augus
   ```

2. **Download the PocketBase Linux binary** and place it in the project root:
   ```bash
   wget https://github.com/pocketbase/pocketbase/releases/download/v0.25.9/pocketbase_0.25.9_linux_amd64.zip
   unzip pocketbase_0.25.9_linux_amd64.zip pocketbase
   rm pocketbase_0.25.9_linux_amd64.zip
   ```

3. **Edit the Caddyfile** — replace `your-domain.com` with your actual domain:
   ```
   your-domain.com {
       reverse_proxy app:8090
   }
   ```

4. **Start everything:**
   ```bash
   docker compose up --build -d
   ```
   Caddy automatically obtains an HTTPS certificate via Let's Encrypt.

5. **Create an admin account:**
   ```bash
   docker compose exec app ./pocketbase superuser create admin@example.com yourpassword
   ```

6. **Open your site:**
   - Visitor app: `https://your-domain.com`
   - Admin panel: `https://your-domain.com/admin/`

### Updating

Pull the latest changes and rebuild:
```bash
git pull
docker compose up --build -d
```

PocketBase runs new migrations automatically on startup.

---

## Getting Started — Your First Exhibition

### 1. Create a Set

A **set** is an exhibition or tour — a named collection of objects.

1. Go to the admin panel and log in
2. Click **+ New Set**
3. Fill in the name (auto-generates a URL slug)
4. Under **Languages**, add the languages your content is available in
5. Save — the floor/map settings appear after the first save
6. Optionally: upload a floor plan image, set colors and fonts, add an About page

### 2. Add Objects

An **object** is a single exhibit — something visitors scan a QR code to learn about.

1. Go to the **Objects** tab and select your set
2. Click **+ New Object**
3. Fill in the name (per language) — slug auto-generates
4. Upload audio (MP3) and subtitles (WebVTT `.vtt` file) per language
5. Click on the map to place the object's pin (if you uploaded a floor plan)
6. Save

### 3. Add Images

Below the object form, upload images for the gallery:
- **Regular images** — shown in the carousel and gallery
- **360° photos** — set media type to "360°", viewed in an interactive panorama viewer
- **3D models** — set media type to "3D model", upload a `.glb` file
- **Videos** — set media type to "Video", upload an `.mp4` file, optionally add subtitle files per language

### 4. Print QR Codes

1. Open an object in the admin
2. Click **QR Code**
3. Download the QR code image
4. Print and place next to the exhibit

The QR code links directly to `https://your-domain.com/#/set-slug/object-slug`.

> **Tip:** See `docs/qr-sign-design-guide.md` for best practices on designing effective QR signs.

### 5. Organize with Groups (Optional)

If your exhibition has distinct rooms or sections:

1. In the objects list, click **+ New Group**
2. Edit the group's title and optional color
3. Drag objects into the group, or use the arrow buttons
4. Groups appear as labeled sections in the visitor's list view

---

## Admin Reference

### Set Options

| Option | Description |
|--------|-------------|
| Languages | Which languages content is available in. UI adapts dynamically. |
| Sequential navigation | Show previous/next buttons between objects |
| Show object numbers | Display numbers in the list and on map pins |
| Color scheme | Primary color (buttons, pins) and background color |
| Custom font | Upload a `.woff2` or `.ttf` font for the exhibition |
| Subtitle font | Choose the font for the transcript area |
| Logo | Shown in the visitor app header |
| About page | Rich text editor (bold, italic, links, headings) |
| Floors | Indoor floor plans or outdoor GPS map areas |
| Show "Powered by Augus" | Toggle the footer on the About page |

### Object Options

| Option | Description |
|--------|-------------|
| Name | Per language, shown in the header and list |
| Audio | MP3 file per language |
| Subtitles | WebVTT (`.vtt`) file per language, synced to audio |
| Default language | Fallback if visitor's language has no audio |
| Map position | Click on the floor plan to place the pin |
| Group | Assign to a group (room/section) |
| Published | Hide from visitors without deleting |

### Media Types

| Type | Description |
|------|-------------|
| Image | Standard photo, shown in carousel and gallery |
| 360° | Equirectangular panorama, interactive sphere viewer with gyroscope |
| 3D model | GLB/glTF file, interactive 3D viewer with auto-rotate and AR |
| Video | MP4/WebM with native player, optional per-language VTT subtitles |

---

## Visitor Experience

Visitors access the audio guide by scanning a QR code or opening a link. No download, no sign-up.

- **Audio player** with play/pause, skip ±15s, playback speed control
- **Synced subtitles** that highlight as the audio plays (tap a line to seek)
- **Image carousel** with swipe navigation
- **Full-screen gallery** with pinch-to-zoom, 360° viewer, 3D viewer, or video player
- **List view** showing all objects, grouped if configured
- **Map view** with numbered pins on floor plans or GPS markers outdoors
- **Settings** — language, font size, autoplay, GPS auto-play
- **Lock-screen controls** — audio continues with lock-screen play/pause

---

## Project Structure

```
augus/
├── pb_migrations/          # Database schema migrations (JS)
├── pb_public/              # Static files served by PocketBase
│   ├── index.html          # Visitor app
│   ├── admin/              # Admin panel
│   │   ├── index.html
│   │   ├── js/admin.js
│   │   └── css/admin.css
│   ├── js/
│   │   ├── app.js          # Visitor app logic
│   │   └── lib/            # Vendored libraries
│   │       ├── jsQR.js
│   │       ├── pannellum/
│   │       ├── model-viewer/
│   │       ├── leaflet/
│   │       └── dompurify/
│   └── css/style.css       # Visitor styles
├── docs/                   # Documentation
├── Dockerfile
├── docker-compose.yml
├── Caddyfile
└── CLAUDE.md               # AI assistant instructions
```

## Technology

- **Backend:** [PocketBase](https://pocketbase.io) (Go, single binary, SQLite)
- **Frontend:** Vanilla JavaScript, no framework, no build step
- **Libraries:** Pannellum (360°), model-viewer (3D), Leaflet (maps), jsQR (scanner), Quill (editor), DOMPurify (sanitization)
- **Deployment:** Docker + Caddy (auto HTTPS)

## License

[AGPL-3.0](LICENSE)

## Known Issues

(none currently)
