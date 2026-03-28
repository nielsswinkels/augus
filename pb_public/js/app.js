// ============================================
// Augus — Visitor Frontend Application
// ============================================

const PB_URL = window.location.origin;

// ===== i18n =====
const i18n = {
  en: {
    objectList: "Objects",
    scanQR: "Scan QR code",
    settings: "Settings",
    settingsTitle: "Settings",
    autoplay: "Autoplay audio",
    language: "Language",
    fontSize: "Font size",
    captionsAloud: "Read image captions aloud",
    hintAutoplay: "Play audio automatically when opening an object",
    hintCaptionsAloud: "Use text-to-speech to read image captions in the gallery",
    scanText: "Scan the QR code on the next object",
    noAudio: "No audio available for this object.",
    unrecognizedQR: "Unrecognized QR code",
    close: "Close",
    play: "Play",
    pause: "Pause",
    skipBack: "Skip back 15 seconds",
    skipForward: "Skip forward 15 seconds",
    objectListLabel: "Object list",
    mapView: "Map view",
    listView: "List view",
    viewGallery: "View image gallery",
    prevImage: "Previous image",
    nextImage: "Next image",
    closeGallery: "Close gallery",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    mapHome: "Reset map view",
    loading: "Loading...",
    navList: "List",
    navMap: "Map",
    navScan: "Scan",
    navSettings: "Settings",
    cameraPrompt: "To scan QR codes on exhibit labels, we need access to your camera.",
    allowCamera: "Allow Camera",
  },
  sv: {
    objectList: "Objekt",
    scanQR: "Skanna QR-kod",
    settings: "Inställningar",
    settingsTitle: "Inställningar",
    autoplay: "Autospela ljud",
    language: "Språk",
    fontSize: "Textstorlek",
    captionsAloud: "Läs bildtexter högt",
    hintAutoplay: "Spela ljud automatiskt när du öppnar ett objekt",
    hintCaptionsAloud: "Använd text-till-tal för att läsa bildtexter i galleriet",
    scanText: "Skanna QR-koden på nästa objekt",
    noAudio: "Inget ljud tillgängligt för detta objekt.",
    unrecognizedQR: "Okänd QR-kod",
    close: "Stäng",
    play: "Spela",
    pause: "Pausa",
    skipBack: "Hoppa tillbaka 15 sekunder",
    skipForward: "Hoppa framåt 15 sekunder",
    objectListLabel: "Objektlista",
    mapView: "Kartvy",
    listView: "Listvy",
    viewGallery: "Visa bildgalleri",
    prevImage: "Föregående bild",
    nextImage: "Nästa bild",
    closeGallery: "Stäng galleri",
    zoomIn: "Zooma in",
    zoomOut: "Zooma ut",
    mapHome: "Återställ kartvyn",
    loading: "Laddar...",
    navList: "Lista",
    navMap: "Karta",
    navScan: "Skanna",
    navSettings: "Inställningar",
    cameraPrompt: "Vi behöver tillgång till din kamera för att skanna QR-koder på utställningsskyltarna.",
    allowCamera: "Tillåt kamera",
  },
};

// ===== State =====
const state = {
  settings: {
    autoplay: true,
    language: "sv",
    fontSize: "normal",
    captionsAloud: false,
  },
  currentSet: null,
  currentObject: null,
  objects: [],
  images: [],
  subtitleCues: [],
  galleryIndex: 0,
  previousView: "list",
  scannerActive: false,
  mapZoom: 1,
  mapPan: { x: 0, y: 0 },
  audioPausedByGallery: false,
};

// ===== DOM References =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  headerTitle: $("#headerTitle"),
  btnList: $("#btnList"),
  btnScan: $("#btnScan"),
  btnSettings: $("#btnSettings"),
  bottomNav: $("#bottomNav"),
  labelNavList: $("#labelNavList"),
  labelNavMap: $("#labelNavMap"),
  labelNavScan: $("#labelNavScan"),
  labelNavSettings: $("#labelNavSettings"),
  // Object page
  viewObject: $("#viewObject"),
  thumbnailContainer: $("#thumbnailContainer"),
  thumbnail: $("#thumbnail"),
  subtitlesArea: $("#subtitlesArea"),
  noAudioMessage: $("#noAudioMessage"),
  // Audio player
  audioPlayer: $("#audioPlayer"),
  audioElement: $("#audioElement"),
  playerCurrentTime: $("#playerCurrentTime"),
  playerDuration: $("#playerDuration"),
  playerSeekbar: $("#playerSeekbar"),
  btnPlayPause: $("#btnPlayPause"),
  iconPlay: $("#iconPlay"),
  iconPause: $("#iconPause"),
  btnSkipBack: $("#btnSkipBack"),
  btnSkipForward: $("#btnSkipForward"),
  btnPlaybackSpeed: $("#btnPlaybackSpeed"),
  // List view
  viewList: $("#viewList"),
  objectList: $("#objectList"),
  btnMapView: $("#btnMapView"),
  // Map view
  viewMap: $("#viewMap"),
  mapViewContainer: $("#mapViewContainer"),
  mapContainer: $("#mapContainer"),
  mapImage: $("#mapImage"),
  btnMapHome: $("#btnMapHome"),
  btnZoomIn: $("#btnZoomIn"),
  btnZoomOut: $("#btnZoomOut"),
  // Scanner
  viewScanner: $("#viewScanner"),
  scannerVideo: $("#scannerVideo"),
  scannerText: $("#scannerText"),
  scannerToast: $("#scannerToast"),
  // Settings
  settingsOverlay: $("#settingsOverlay"),
  settingsTitle: $("#settingsTitle"),
  settingAutoplay: $("#settingAutoplay"),
  settingCaptionsAloud: $("#settingCaptionsAloud"),
  btnCloseSettings: $("#btnCloseSettings"),
  // Gallery
  galleryOverlay: $("#galleryOverlay"),
  galleryCounter: $("#galleryCounter"),
  galleryImage: $("#galleryImage"),
  galleryCaption: $("#galleryCaption"),
  btnGalleryPrev: $("#btnGalleryPrev"),
  btnGalleryNext: $("#btnGalleryNext"),
  btnCloseGallery: $("#btnCloseGallery"),
  // Toast
  toast: $("#toast"),
};

// ===== Settings =====
function loadSettings() {
  try {
    const saved = localStorage.getItem("augus_settings");
    if (saved) {
      Object.assign(state.settings, JSON.parse(saved));
    } else {
      // First visit: detect browser language
      const browserLang = (navigator.language || navigator.userLanguage || "sv").slice(0, 2).toLowerCase();
      state.settings.language = browserLang === "sv" ? "sv" : "en";
    }
  } catch (e) { /* ignore */ }
  applySettings();
}

function saveSettings() {
  localStorage.setItem("augus_settings", JSON.stringify(state.settings));
  applySettings();
}

function applySettings() {
  // Font size
  document.body.classList.remove("font-xl", "font-xxl");
  if (state.settings.fontSize === "xl") document.body.classList.add("font-xl");
  if (state.settings.fontSize === "xxl") document.body.classList.add("font-xxl");

  // Language UI
  document.documentElement.lang = state.settings.language;
  updateUILanguage();

  // Autoplay toggle
  dom.settingAutoplay.checked = state.settings.autoplay;
  dom.settingCaptionsAloud.checked = state.settings.captionsAloud;

  // Language segmented
  $$("[data-lang]").forEach((btn) => {
    const isActive = btn.dataset.lang === state.settings.language;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-checked", isActive);
  });

  // Font size segmented
  $$("[data-fontsize]").forEach((btn) => {
    const isActive = btn.dataset.fontsize === state.settings.fontSize;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-checked", isActive);
  });
}

function updateUILanguage() {
  const t = i18n[state.settings.language] || i18n.en;
  dom.scannerText.textContent = t.scanText;
  dom.settingsTitle.textContent = t.settingsTitle;
  $("#labelAutoplay").textContent = t.autoplay;
  $("#labelLanguage").textContent = t.language;
  $("#labelFontSize").textContent = t.fontSize;
  $("#labelCaptionsAloud").textContent = t.captionsAloud;
  dom.btnList.setAttribute("aria-label", t.objectListLabel);
  dom.btnList.setAttribute("title", t.objectListLabel);
  dom.btnScan.setAttribute("aria-label", t.scanQR);
  dom.btnScan.setAttribute("title", t.scanQR);
  dom.btnSettings.setAttribute("aria-label", t.settings);
  dom.btnSettings.setAttribute("title", t.settings);
  dom.btnSkipBack.setAttribute("aria-label", t.skipBack);
  dom.btnSkipForward.setAttribute("aria-label", t.skipForward);
  dom.btnMapView.setAttribute("aria-label", t.mapView);
  dom.btnMapView.setAttribute("title", t.mapView);

  dom.btnCloseGallery.setAttribute("aria-label", t.closeGallery);
  dom.btnGalleryPrev.setAttribute("aria-label", t.prevImage);
  dom.btnGalleryNext.setAttribute("aria-label", t.nextImage);
  dom.btnMapHome.setAttribute("aria-label", t.mapHome);
  dom.btnZoomIn.setAttribute("aria-label", t.zoomIn);
  dom.btnZoomOut.setAttribute("aria-label", t.zoomOut);

  // Bottom nav labels
  dom.labelNavList.textContent = t.navList;
  dom.labelNavMap.textContent = t.navMap;
  dom.labelNavScan.textContent = t.navScan;
  dom.labelNavSettings.textContent = t.navSettings;
}

function t(key) {
  return (i18n[state.settings.language] || i18n.en)[key] || key;
}

// ===== API helpers =====
async function api(path) {
  const resp = await fetch(`${PB_URL}/api/collections/${path}`);
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

function fileUrl(collectionName, recordId, filename) {
  return `${PB_URL}/api/files/${collectionName}/${recordId}/${filename}`;
}

// ===== Routing (hash-based) =====
// URLs: /#/set-slug/object-slug or /#/set-slug
function parseRoute() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);
  if (parts.length >= 2) {
    return { setSlug: parts[0], objectSlug: parts[1] };
  }
  if (parts.length === 1) {
    return { setSlug: parts[0], objectSlug: null };
  }
  return { setSlug: null, objectSlug: null };
}

function navigateTo(setSlug, objectSlug) {
  const hash = objectSlug ? `#/${setSlug}/${objectSlug}` : `#/${setSlug}`;
  if (window.location.hash === hash) {
    // Hash unchanged — manually trigger route load
    loadRoute();
  } else {
    window.location.hash = hash;
  }
}

// ===== Data Loading =====
async function loadRoute() {
  const route = parseRoute();
  if (!route.setSlug) {
    showView("list");
    return;
  }

  document.getElementById('loadingIndicator').style.display = 'flex';

  try {
    // Load set
    const setsResp = await api(`sets/records?filter=(slug='${encodeURIComponent(route.setSlug)}')`);
    if (!setsResp.items || setsResp.items.length === 0) {
      showToast("Set not found");
      return;
    }
    state.currentSet = setsResp.items[0];
    applySetColors(state.currentSet);

    // Load all objects in this set
    const objResp = await api(`objects/records?filter=(set='${state.currentSet.id}')&sort=sort_order&perPage=200`);
    state.objects = objResp.items || [];

    if (route.objectSlug) {
      const obj = state.objects.find((o) => o.slug === route.objectSlug);
      if (obj) {
        await loadObject(obj);
        showView("object");
      } else {
        showToast("Object not found");
        showView("list");
      }
    } else {
      showView("list");
    }
  } catch (err) {
    console.error("Failed to load route:", err);
    showToast("Failed to load content");
  } finally {
    document.getElementById('loadingIndicator').style.display = 'none';
  }
}

async function loadObject(obj) {
  // Stop any existing audio
  stopAudio();

  state.currentObject = obj;

  // Update header
  const lang = state.settings.language;
  const name = obj[`name_${lang}`] || obj.name_en || "Object";
  dom.headerTitle.textContent = name;
  document.title = `${name} — Augus`;

  // Load images
  try {
    const imgResp = await api(`object_images/records?filter=(object='${obj.id}')&sort=sort_order&perPage=100`);
    state.images = imgResp.items || [];
  } catch (e) {
    state.images = [];
  }

  // Show thumbnail only if images exist
  if (state.images.length > 0) {
    const firstImg = state.images[0];
    const url = fileUrl("object_images", firstImg.id, firstImg.image);
    dom.thumbnail.src = url;
    const caption = firstImg[`caption_${lang}`] || firstImg.caption_en || "";
    dom.thumbnail.alt = caption || name;
    dom.thumbnail.setAttribute("aria-label", t("viewGallery"));
    dom.thumbnailContainer.classList.remove("hidden");
  } else {
    dom.thumbnail.src = "";
    dom.thumbnailContainer.classList.add("hidden");
  }

  // Determine audio track
  const audioField = `audio_${lang}`;
  const subtitleField = `subtitles_${lang}`;
  let audioFile = obj[audioField];
  let subtitleFile = obj[subtitleField];

  // Fallback to default language
  if (!audioFile && obj.default_language && obj.default_language !== lang) {
    audioFile = obj[`audio_${obj.default_language}`];
    subtitleFile = obj[`subtitles_${obj.default_language}`];
  }

  if (audioFile) {
    const audioUrl = fileUrl("objects", obj.id, audioFile);
    dom.audioElement.src = audioUrl;
    dom.audioPlayer.classList.remove("hidden");
    dom.subtitlesArea.classList.remove("hidden");
    dom.noAudioMessage.classList.add("hidden");

    // Load subtitles
    if (subtitleFile) {
      const subtitleUrl = fileUrl("objects", obj.id, subtitleFile);
      await loadSubtitles(subtitleUrl);
    } else {
      state.subtitleCues = [];
      renderSubtitles();
    }

    // Autoplay
    if (state.settings.autoplay) {
      try {
        await dom.audioElement.play();
      } catch (e) {
        // Autoplay blocked by browser — user will have to tap play
      }
    }

    // Media Session API
    setupMediaSession(name);
  } else {
    dom.audioElement.src = "";
    dom.audioPlayer.classList.add("hidden");
    dom.subtitlesArea.classList.add("hidden");
    dom.noAudioMessage.textContent = t("noAudio");
    dom.noAudioMessage.classList.remove("hidden");
    state.subtitleCues = [];
    dom.subtitlesArea.innerHTML = "";
  }
}

// ===== Subtitles (WebVTT) =====
async function loadSubtitles(url) {
  try {
    const resp = await fetch(url);
    const text = await resp.text();
    state.subtitleCues = parseVTT(text);
    renderSubtitles();
  } catch (e) {
    console.error("Failed to load subtitles:", e);
    state.subtitleCues = [];
    renderSubtitles();
  }
}

function parseVTT(text) {
  const cues = [];
  const blocks = text.split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    // Find the timing line
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(
        /(\d{2}:)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}:)?(\d{2}):(\d{2})[.,](\d{3})/
      );
      if (match) {
        const startH = match[1] ? parseInt(match[1]) : 0;
        const startM = parseInt(match[2]);
        const startS = parseInt(match[3]);
        const startMs = parseInt(match[4]);
        const endH = match[5] ? parseInt(match[5]) : 0;
        const endM = parseInt(match[6]);
        const endS = parseInt(match[7]);
        const endMs = parseInt(match[8]);
        const start = startH * 3600 + startM * 60 + startS + startMs / 1000;
        const end = endH * 3600 + endM * 60 + endS + endMs / 1000;
        const textLines = lines.slice(i + 1).join("\n").trim();
        if (textLines) {
          cues.push({ start, end, text: textLines });
        }
        break;
      }
    }
  }
  return cues;
}

function renderSubtitles() {
  dom.subtitlesArea.innerHTML = "";
  for (let i = 0; i < state.subtitleCues.length; i++) {
    const cue = state.subtitleCues[i];
    const div = document.createElement("div");
    div.className = "subtitle-cue";
    div.textContent = cue.text;
    div.dataset.index = i;
    div.addEventListener("click", () => {
      dom.audioElement.currentTime = cue.start;
      if (dom.audioElement.paused) dom.audioElement.play();
    });
    dom.subtitlesArea.appendChild(div);
  }
}

function updateSubtitleHighlight() {
  const time = dom.audioElement.currentTime;
  const cueElements = dom.subtitlesArea.querySelectorAll(".subtitle-cue");
  let activeEl = null;

  cueElements.forEach((el, i) => {
    const cue = state.subtitleCues[i];
    if (cue && time >= cue.start && time < cue.end) {
      el.classList.add("active");
      activeEl = el;
    } else {
      el.classList.remove("active");
    }
  });

  // Auto-scroll to active cue
  if (activeEl) {
    activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// ===== Audio Player =====
function setupAudioEvents() {
  const audio = dom.audioElement;

  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    dom.playerCurrentTime.textContent = formatTime(audio.currentTime);
    dom.playerSeekbar.value = (audio.currentTime / audio.duration) * 100;
    dom.playerSeekbar.setAttribute("aria-valuenow", Math.round(dom.playerSeekbar.value));
    updateSubtitleHighlight();
  });

  audio.addEventListener("loadedmetadata", () => {
    dom.playerDuration.textContent = formatTime(audio.duration);
    dom.playerSeekbar.max = 100;
  });

  audio.addEventListener("play", () => {
    dom.iconPlay.classList.add("hidden");
    dom.iconPause.classList.remove("hidden");
    dom.btnPlayPause.setAttribute("aria-label", t("pause"));
  });

  audio.addEventListener("pause", () => {
    dom.iconPlay.classList.remove("hidden");
    dom.iconPause.classList.add("hidden");
    dom.btnPlayPause.setAttribute("aria-label", t("play"));
  });

  dom.btnPlayPause.addEventListener("click", () => {
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  });

  dom.btnSkipBack.addEventListener("click", () => {
    audio.currentTime = Math.max(0, audio.currentTime - 15);
  });

  dom.btnSkipForward.addEventListener("click", () => {
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 15);
  });

  dom.playerSeekbar.addEventListener("input", () => {
    if (audio.duration) {
      audio.currentTime = (dom.playerSeekbar.value / 100) * audio.duration;
    }
  });
}

function stopAudio() {
  const audio = dom.audioElement;
  audio.pause();
  audio.currentTime = 0;
  audio.src = "";
  dom.audioPlayer.classList.add("hidden");
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function setupMediaSession(title) {
  if (!("mediaSession" in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: title,
    artist: "Augus",
  });
  navigator.mediaSession.setActionHandler("play", () => dom.audioElement.play());
  navigator.mediaSession.setActionHandler("pause", () => dom.audioElement.pause());
  navigator.mediaSession.setActionHandler("seekbackward", () => {
    dom.audioElement.currentTime = Math.max(0, dom.audioElement.currentTime - 15);
  });
  navigator.mediaSession.setActionHandler("seekforward", () => {
    dom.audioElement.currentTime = Math.min(
      dom.audioElement.duration || 0,
      dom.audioElement.currentTime + 15
    );
  });
}

// ===== Focus Trap Utility =====
let galleryFocusTrapCleanup = null;
let galleryPreviousFocus = null;
let settingsFocusTrapCleanup = null;
let settingsPreviousFocus = null;

function trapFocus(container) {
  const focusable = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  function handler(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  container.addEventListener('keydown', handler);
  if (first) first.focus();
  return () => container.removeEventListener('keydown', handler);
}

// ===== Gallery =====
function openGallery(index = 0) {
  if (state.images.length === 0) return;
  state.galleryIndex = index;

  // Pause audio if captionsAloud is on
  if (state.settings.captionsAloud && !dom.audioElement.paused) {
    dom.audioElement.pause();
    state.audioPausedByGallery = true;
  }

  renderGalleryImage();
  dom.galleryOverlay.classList.add("active");
  galleryPreviousFocus = document.activeElement;
  galleryFocusTrapCleanup = trapFocus(dom.galleryOverlay);
}

function closeGallery() {
  dom.galleryOverlay.classList.remove("active");
  if (galleryFocusTrapCleanup) { galleryFocusTrapCleanup(); galleryFocusTrapCleanup = null; }
  if (galleryPreviousFocus) { galleryPreviousFocus.focus(); galleryPreviousFocus = null; }
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();

  // Resume audio if we paused it
  if (state.audioPausedByGallery) {
    dom.audioElement.play();
    state.audioPausedByGallery = false;
  }
}

function renderGalleryImage() {
  const img = state.images[state.galleryIndex];
  if (!img) return;

  const url = fileUrl("object_images", img.id, img.image);
  dom.galleryImage.src = url;

  const lang = state.settings.language;
  const caption = img[`caption_${lang}`] || img.caption_en || "";
  dom.galleryImage.alt = caption || `Image ${state.galleryIndex + 1}`;
  dom.galleryCaption.textContent = caption;
  dom.galleryCounter.textContent = `${state.galleryIndex + 1} / ${state.images.length}`;

  // Hide/show nav buttons
  dom.btnGalleryPrev.style.visibility = state.galleryIndex > 0 ? "visible" : "hidden";
  dom.btnGalleryNext.style.visibility =
    state.galleryIndex < state.images.length - 1 ? "visible" : "hidden";

  // Read caption aloud
  if (state.settings.captionsAloud && caption && typeof speechSynthesis !== "undefined") {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(caption);
    const targetLang = state.settings.language === "sv" ? "sv-SE" : "en-US";
    utterance.lang = targetLang;
    // Explicitly pick the best available voice for the target language so
    // browsers don't fall back to the default voice regardless of .lang
    const voices = speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.lang === targetLang) ||
      voices.find((v) => v.lang.startsWith(targetLang.split("-")[0]));
    if (voice) utterance.voice = voice;
    speechSynthesis.speak(utterance);
  }
}

function setupGalleryEvents() {
  dom.thumbnail.addEventListener("click", () => openGallery(0));
  dom.thumbnail.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openGallery(0);
    }
  });

  dom.btnCloseGallery.addEventListener("click", closeGallery);
  dom.btnGalleryPrev.addEventListener("click", () => {
    if (state.galleryIndex > 0) {
      state.galleryIndex--;
      renderGalleryImage();
    }
  });
  dom.btnGalleryNext.addEventListener("click", () => {
    if (state.galleryIndex < state.images.length - 1) {
      state.galleryIndex++;
      renderGalleryImage();
    }
  });

  // Keyboard navigation in gallery
  dom.galleryOverlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeGallery();
    if (e.key === "ArrowLeft" && state.galleryIndex > 0) {
      state.galleryIndex--;
      renderGalleryImage();
    }
    if (e.key === "ArrowRight" && state.galleryIndex < state.images.length - 1) {
      state.galleryIndex++;
      renderGalleryImage();
    }
  });
}

// ===== List View =====
function renderObjectList() {
  const lang = state.settings.language;
  dom.objectList.innerHTML = "";
  for (const obj of state.objects) {
    const name = obj[`name_${lang}`] || obj.name_en || "Object";
    const isCurrent = state.currentObject && state.currentObject.id === obj.id;

    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = `object-list__item${isCurrent ? " current" : ""}`;
    a.href = `#/${state.currentSet.slug}/${obj.slug}`;
    a.setAttribute("role", "listitem");
    a.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(state.currentSet.slug, obj.slug);
    });

    a.innerHTML = `
      <span class="object-list__number">${obj.sort_order}</span>
      <div class="object-list__info">
        <div class="object-list__name">${escapeHtml(name)}</div>
      </div>
    `;

    li.appendChild(a);
    dom.objectList.appendChild(li);
  }

  // Load thumbnails for list items asynchronously
  loadListThumbnails();
}

async function loadListThumbnails() {
  await Promise.all(state.objects.map(async (obj) => {
    try {
      const imgResp = await api(
        `object_images/records?filter=(object='${obj.id}')&sort=sort_order&perPage=1`
      );
      if (imgResp.items && imgResp.items.length > 0) {
        const imgRecord = imgResp.items[0];
        const url = fileUrl("object_images", imgRecord.id, imgRecord.image);
        const listItem = dom.objectList.querySelector(`a[href="#/${state.currentSet.slug}/${obj.slug}"]`);
        if (listItem) {
          const img = document.createElement("img");
          img.className = "object-list__thumb";
          img.src = url;
          img.alt = "";
          img.loading = "lazy";
          listItem.insertBefore(img, listItem.querySelector(".object-list__info"));
        }
      }
    } catch (e) { /* ignore */ }
  }));
}

// ===== Map View =====
function renderMapView() {
  if (!state.currentSet || !state.currentSet.map_image) return;

  const lang = state.settings.language;

  const mapUrl = fileUrl("sets", state.currentSet.id, state.currentSet.map_image);
  dom.mapImage.src = mapUrl;

  // Remove old pins
  dom.mapContainer.querySelectorAll(".map-pin").forEach((el) => el.remove());

  // Add pins for each object
  for (const obj of state.objects) {
    if (obj.map_x == null || obj.map_y == null || obj.map_x < 0 || obj.map_y < 0) continue;
    const pin = document.createElement("a");
    pin.className = "map-pin";
    pin.href = `#/${state.currentSet.slug}/${obj.slug}`;
    pin.textContent = obj.sort_order;
    pin.style.left = `${obj.map_x}%`;
    pin.style.top = `${obj.map_y}%`;
    const name = obj[`name_${lang}`] || obj.name_en || "Object";
    pin.setAttribute("aria-label", `${obj.sort_order}. ${name}`);
    pin.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(state.currentSet.slug, obj.slug);
    });
    dom.mapContainer.appendChild(pin);
  }

  // Center map vertically within the container (width is already 100% via CSS)
  dom.mapImage.onload = () => {
    const containerH = dom.mapViewContainer.clientHeight;
    const containerW = dom.mapViewContainer.clientWidth;
    const renderedH = dom.mapImage.naturalHeight * (containerW / dom.mapImage.naturalWidth);
    state.mapZoom = 1;
    state.mapPan = { x: 0, y: Math.max(0, (containerH - renderedH) / 2) };
    state.mapHomeZoom = state.mapZoom;
    state.mapHomePan = { ...state.mapPan };
    applyMapTransform();
  };
  if (dom.mapImage.complete) dom.mapImage.onload();
}

function applyMapTransform() {
  dom.mapContainer.style.transform = `translate(${state.mapPan.x}px, ${state.mapPan.y}px) scale(${state.mapZoom})`;
  // Counter-scale pins so they stay the same visual size regardless of zoom level
  const invScale = 1 / state.mapZoom;
  dom.mapContainer.querySelectorAll(".map-pin").forEach(pin => {
    pin.style.transform = `translate(-50%, -50%) scale(${invScale})`;
  });
}

function setupMapEvents() {
  dom.btnMapHome.addEventListener("click", () => {
    state.mapZoom = state.mapHomeZoom ?? 1;
    state.mapPan = state.mapHomePan ? { ...state.mapHomePan } : { x: 0, y: 0 };
    applyMapTransform();
  });

  function zoomTowardCenter(factor) {
    const rect = dom.mapViewContainer.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    // Map-space coordinates currently under the screen center
    const mx = (cx - state.mapPan.x) / state.mapZoom;
    const my = (cy - state.mapPan.y) / state.mapZoom;
    state.mapZoom = Math.max(0.5, Math.min(4, state.mapZoom * factor));
    // Reposition so the same map point stays under the screen center
    state.mapPan.x = cx - mx * state.mapZoom;
    state.mapPan.y = cy - my * state.mapZoom;
    applyMapTransform();
  }

  dom.btnZoomIn.addEventListener("click", () => zoomTowardCenter(1.3));
  dom.btnZoomOut.addEventListener("click", () => zoomTowardCenter(1 / 1.3));

  // Double-tap-drag to zoom (one-handed zoom gesture)
  let lastTapTime = 0;
  let doubleTapDragging = false;
  let doubleTapStartY = 0;
  let doubleTapStartZoom = 1;
  let doubleTapAnchor = { mx: 0, my: 0, sx: 0, sy: 0 }; // map-space and screen-space anchor

  dom.mapViewContainer.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".map-controls") || e.target.closest(".map-pin")) return;
    const now = Date.now();
    if (now - lastTapTime < 300 && activePointers.size === 0) {
      // Second tap — start double-tap-drag zoom
      doubleTapDragging = true;
      doubleTapStartY = e.clientY;
      doubleTapStartZoom = state.mapZoom;
      // Anchor: the point under the tap stays fixed during zoom
      doubleTapAnchor.sx = e.clientX;
      doubleTapAnchor.sy = e.clientY;
      doubleTapAnchor.mx = (e.clientX - state.mapPan.x) / state.mapZoom;
      doubleTapAnchor.my = (e.clientY - state.mapPan.y) / state.mapZoom;
      dom.mapViewContainer.setPointerCapture(e.pointerId);
      e.preventDefault();
      lastTapTime = 0; // reset so a third tap doesn't re-trigger
      return;
    }
    lastTapTime = now;
  }, true); // use capture so it fires before the pan handler

  dom.mapViewContainer.addEventListener("pointermove", (e) => {
    if (!doubleTapDragging) return;
    const dy = doubleTapStartY - e.clientY; // drag up = positive = zoom in
    const factor = Math.pow(2, dy / 150); // 150px of drag = 2× zoom
    state.mapZoom = Math.max(0.5, Math.min(5, doubleTapStartZoom * factor));
    // Reposition so anchor point stays under the original tap position
    state.mapPan.x = doubleTapAnchor.sx - doubleTapAnchor.mx * state.mapZoom;
    state.mapPan.y = doubleTapAnchor.sy - doubleTapAnchor.my * state.mapZoom;
    applyMapTransform();
  });

  dom.mapViewContainer.addEventListener("pointerup", (e) => {
    if (doubleTapDragging) {
      doubleTapDragging = false;
      return;
    }
  });

  // Pan (1 finger / mouse) + pinch-to-zoom (2 fingers)
  const activePointers = new Map(); // pointerId -> {x, y}
  let lastPinchDist = 0;

  function pinchDist() {
    const [a, b] = [...activePointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function pinchMid() {
    const [a, b] = [...activePointers.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  dom.mapViewContainer.addEventListener("pointerdown", (e) => {
    if (doubleTapDragging) return;
    if (e.target.closest(".map-controls")) return;
    // Don't start a single-finger drag from a pin (preserves tap-to-navigate)
    if (e.target.closest(".map-pin") && activePointers.size === 0) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dom.mapViewContainer.setPointerCapture(e.pointerId);
    if (activePointers.size === 2) lastPinchDist = pinchDist();
  });

  dom.mapViewContainer.addEventListener("pointermove", (e) => {
    if (!activePointers.has(e.pointerId)) return;
    const prev = activePointers.get(e.pointerId);
    const curr = { x: e.clientX, y: e.clientY };
    activePointers.set(e.pointerId, curr);

    if (activePointers.size === 1) {
      // Single-finger pan
      state.mapPan.x += curr.x - prev.x;
      state.mapPan.y += curr.y - prev.y;
      applyMapTransform();
    } else if (activePointers.size === 2 && lastPinchDist > 0) {
      // Two-finger pinch: zoom toward the midpoint between fingers
      const newDist = pinchDist();
      const ratio = newDist / lastPinchDist;
      const mid = pinchMid();
      // Map coordinates currently under the midpoint
      const mx = (mid.x - state.mapPan.x) / state.mapZoom;
      const my = (mid.y - state.mapPan.y) / state.mapZoom;
      state.mapZoom = Math.max(0.5, Math.min(5, state.mapZoom * ratio));
      // Reposition pan so the same map point stays under the midpoint
      state.mapPan.x = mid.x - mx * state.mapZoom;
      state.mapPan.y = mid.y - my * state.mapZoom;
      lastPinchDist = newDist;
      applyMapTransform();
    }
  });

  dom.mapViewContainer.addEventListener("pointerup", (e) => {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) lastPinchDist = 0;
  });

  dom.mapViewContainer.addEventListener("pointercancel", (e) => {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) lastPinchDist = 0;
  });
}

// ===== QR Scanner =====
let scannerStream = null;
let scannerRAF = null;
let scannerCanvas = null;
let scannerCtx = null;

async function startScanner() {
  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    dom.scannerVideo.srcObject = scannerStream;
    scannerCanvas = document.createElement("canvas");
    scannerCtx = scannerCanvas.getContext("2d");
    state.scannerActive = true;
    scanFrame();
  } catch (e) {
    console.error("Camera access denied:", e);
    showToast("Camera access denied");
    showView(state.previousView);
  }
}

function stopScanner() {
  state.scannerActive = false;
  if (scannerRAF) cancelAnimationFrame(scannerRAF);
  if (scannerStream) {
    scannerStream.getTracks().forEach((track) => track.stop());
    scannerStream = null;
  }
  scannerCanvas = null;
  scannerCtx = null;
  dom.scannerVideo.srcObject = null;
}

function scanFrame() {
  if (!state.scannerActive) return;

  const video = dom.scannerVideo;
  if (video.readyState !== video.HAVE_ENOUGH_DATA) {
    scannerRAF = requestAnimationFrame(scanFrame);
    return;
  }

  if (scannerCanvas.width !== video.videoWidth || scannerCanvas.height !== video.videoHeight) {
    scannerCanvas.width = video.videoWidth;
    scannerCanvas.height = video.videoHeight;
  }
  scannerCtx.drawImage(video, 0, 0);
  const imageData = scannerCtx.getImageData(0, 0, scannerCanvas.width, scannerCanvas.height);

  if (typeof jsQR !== "undefined") {
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code && code.data) {
      handleQRCode(code.data);
    }
  }

  scannerRAF = requestAnimationFrame(scanFrame);
}

function handleQRCode(data) {
  // Only accept URLs matching our system
  const currentHost = window.location.host;
  let url;
  try {
    url = new URL(data);
  } catch {
    showScannerToast(t("unrecognizedQR"));
    return;
  }

  if (url.host !== currentHost) {
    showScannerToast(t("unrecognizedQR"));
    return;
  }

  // Parse hash-based route: /#/set-slug/object-slug
  const hash = (url.hash || "").replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);
  if (parts.length >= 2) {
    stopScanner();
    navigateTo(parts[0], parts[1]);
  } else {
    // Also support path-based URLs for backwards compat
    const pathParts = url.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      stopScanner();
      navigateTo(pathParts[0], pathParts[1]);
    } else {
      showScannerToast(t("unrecognizedQR"));
    }
  }
}

let scannerToastTimeout = null;
function showScannerToast(msg) {
  if (scannerToastTimeout) clearTimeout(scannerToastTimeout);
  dom.scannerToast.textContent = msg;
  dom.scannerToast.classList.add("visible");
  scannerToastTimeout = setTimeout(() => dom.scannerToast.classList.remove("visible"), 2000);
}

// ===== View Management =====
function showView(name) {
  // Stop audio when leaving object page
  const wasOnObject = dom.viewObject.classList.contains("active");
  if (wasOnObject && name !== "object") {
    stopAudio();
  }

  // Stop scanner when leaving scanner view
  const wasOnScanner = dom.viewScanner.classList.contains("active");
  if (wasOnScanner && name !== "scanner") {
    stopScanner();
  }

  // Track previous view for scanner back button
  if (name === "scanner") {
    const currentView = getCurrentView();
    if (currentView !== "scanner") state.previousView = currentView;
  }

  // Hide all views
  $$(".view").forEach((v) => v.classList.remove("active"));

  // Map button: visible only when the set has a map
  const hasMap = !!(state.currentSet && state.currentSet.map_image);
  dom.btnMapView.classList.toggle("hidden", !hasMap);

  // Mark active view button
  dom.btnList.classList.toggle("btn--active", name === "list");
  dom.btnMapView.classList.toggle("btn--active", name === "map");
  dom.btnScan.classList.toggle("btn--active", name === "scanner");

  // Header title: set name on list/map views, object name stays on object view
  if ((name === "list" || name === "map") && state.currentSet) {
    const lang = state.settings.language;
    const setName = state.currentSet[`name_${lang}`] || state.currentSet.name_en;
    dom.headerTitle.textContent = setName;
    document.title = `${setName} — Augus`;
    // Keep URL in sync with the set level (no object slug)
    const setHash = `#/${state.currentSet.slug}/`;
    if (window.location.hash !== setHash) {
      history.replaceState(null, "", setHash);
    }
  }

  // Show target
  switch (name) {
    case "object":
      dom.viewObject.classList.add("active");
      break;
    case "list":
      dom.viewList.classList.add("active");
      if (state.currentSet) renderObjectList();
      break;
    case "map":
      dom.viewMap.classList.add("active");
      renderMapView();
      break;
    case "scanner":
      dom.viewScanner.classList.add("active");
      startScanner();
      break;
  }
}

function getCurrentView() {
  if (dom.viewObject.classList.contains("active")) return "object";
  if (dom.viewList.classList.contains("active")) return "list";
  if (dom.viewMap.classList.contains("active")) return "map";
  if (dom.viewScanner.classList.contains("active")) return "scanner";
  return "object";
}

// ===== Settings Events =====
function setupSettingsEvents() {
  dom.btnSettings.addEventListener("click", () => {
    settingsPreviousFocus = document.activeElement;
    dom.settingsOverlay.classList.add("active");
    settingsFocusTrapCleanup = trapFocus(dom.settingsOverlay);
  });

  function closeSettings() {
    dom.settingsOverlay.classList.remove("active");
    if (settingsFocusTrapCleanup) { settingsFocusTrapCleanup(); settingsFocusTrapCleanup = null; }
    if (settingsPreviousFocus) { settingsPreviousFocus.focus(); settingsPreviousFocus = null; }
  }

  dom.btnCloseSettings.addEventListener("click", closeSettings);

  // Close on overlay click
  dom.settingsOverlay.addEventListener("click", (e) => {
    if (e.target === dom.settingsOverlay) {
      closeSettings();
    }
  });

  // Escape to close
  dom.settingsOverlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSettings();
  });

  // Autoplay toggle
  dom.settingAutoplay.addEventListener("change", () => {
    state.settings.autoplay = dom.settingAutoplay.checked;
    saveSettings();
  });

  // Captions aloud toggle
  dom.settingCaptionsAloud.addEventListener("change", () => {
    state.settings.captionsAloud = dom.settingCaptionsAloud.checked;
    saveSettings();
  });

  // Language buttons
  $$("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const oldLang = state.settings.language;
      state.settings.language = btn.dataset.lang;
      saveSettings();
      // Reload current object with new language
      if (state.currentObject && oldLang !== state.settings.language) {
        loadObject(state.currentObject);
      }
      if (dom.viewList.classList.contains("active")) renderObjectList();
      if (dom.viewMap.classList.contains("active")) renderMapView();
    });
  });

  // Font size buttons
  $$("[data-fontsize]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.settings.fontSize = btn.dataset.fontsize;
      saveSettings();
    });
  });
}

// ===== Navigation Events =====
function setupNavigationEvents() {
  dom.btnList.addEventListener("click", () => {
    if (state.currentSet) {
      showView("list");
    }
  });

  dom.btnScan.addEventListener("click", () => showView("scanner"));

  dom.btnMapView.addEventListener("click", () => showView("map"));

  // Browser back/forward (hash-based routing)
  window.addEventListener("hashchange", () => loadRoute());
}

// ===== Toast =====
let toastTimeout = null;
function showToast(msg) {
  if (toastTimeout) clearTimeout(toastTimeout);
  dom.toast.textContent = msg;
  dom.toast.classList.add("visible");
  toastTimeout = setTimeout(() => dom.toast.classList.remove("visible"), 3000);
}

// ===== Colour Scheme =====
function relativeLuminance(hex) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const linear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrastTextColor(hex) {
  // Returns dark or light text colour giving best WCAG contrast on the given bg
  const lum = relativeLuminance(hex);
  const onWhite = (1.05) / (lum + 0.05);
  const onBlack = (lum + 0.05) / (0.0289 + 0.05);
  return onWhite > onBlack ? "#ffffff" : "#1a1a1a";
}

function adjustHex(hex, amount = 30) {
  const lum = relativeLuminance(hex);
  const factor = lum < 0.3 ? amount : -amount; // lighten dark colors, darken light ones
  const clean = hex.replace("#", "");
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp(parseInt(clean.slice(0, 2), 16) + factor);
  const g = clamp(parseInt(clean.slice(2, 4), 16) + factor);
  const b = clamp(parseInt(clean.slice(4, 6), 16) + factor);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function mixToWhite(hex, ratio) {
  // Blend hex toward white by ratio (0 = original, 1 = white)
  const clean = hex.replace("#", "");
  const r = Math.round(parseInt(clean.slice(0, 2), 16) + (255 - parseInt(clean.slice(0, 2), 16)) * ratio);
  const g = Math.round(parseInt(clean.slice(2, 4), 16) + (255 - parseInt(clean.slice(2, 4), 16)) * ratio);
  const b = Math.round(parseInt(clean.slice(4, 6), 16) + (255 - parseInt(clean.slice(4, 6), 16)) * ratio);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function applySetColors(set) {
  const root = document.documentElement.style;

  const primary = set.color_primary || "#0057b8";
  const bg = set.color_accent || "#ffffff";

  // Primary colour + derivatives
  root.setProperty("--color-primary", primary);
  root.setProperty("--color-primary-hover", adjustHex(primary, 30));
  root.setProperty("--color-primary-text", contrastTextColor(primary));

  // Subtitle highlight: very light tint of primary
  root.setProperty("--color-highlight", mixToWhite(primary, 0.85));

  // Background + derivatives
  root.setProperty("--color-bg", bg);
  root.setProperty("--color-text", contrastTextColor(bg));
  // Surface (cards, inputs): slightly darker than bg
  root.setProperty("--color-surface", adjustHex(bg, 10));
  // Border: midpoint between bg and text direction
  root.setProperty("--color-border", adjustHex(bg, 40));
}

// ===== Utility =====
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}


// ===== Init =====
function init() {
  loadSettings();
  setupAudioEvents();
  setupGalleryEvents();
  setupSettingsEvents();
  setupNavigationEvents();
  setupMapEvents();

  // Document-level Escape key handler for modals
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (dom.galleryOverlay.classList.contains("active")) {
      closeGallery();
    } else if (dom.settingsOverlay.classList.contains("active")) {
      dom.btnCloseSettings.click();
    }
  });

  loadRoute();
}

init();
