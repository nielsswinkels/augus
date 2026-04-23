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
    navAbout: "About",
    navSettings: "Settings",
    aboutTitle: "About",
    cameraPrompt: "To scan QR codes on exhibit labels, we need access to your camera.",
    allowCamera: "Allow Camera",
    prevObject: "Previous",
    nextObject: "Next",
    welcomeSubtitle: "Choose an exhibition",
    noExhibitions: "No exhibitions available",
    errorSetNotFound: "This exhibition could not be found. It may have been removed or the link may be incorrect.",
    errorObjectNotFound: "This object could not be found. Please try scanning the QR code again.",
    errorLoadFailed: "Something went wrong while loading. Please check your internet connection and try again.",
    errorUnrecognizedQR: "This QR code isn't recognized. Make sure you're scanning a code from this guide.",
    errorCameraDenied: "Camera access was denied. To scan QR codes, please allow camera access in your browser settings.",
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
    navAbout: "Om",
    navSettings: "Inställningar",
    aboutTitle: "Om",
    cameraPrompt: "Vi behöver tillgång till din kamera för att skanna QR-koder på utställningsskyltarna.",
    allowCamera: "Tillåt kamera",
    prevObject: "Föregående",
    nextObject: "Nästa",
    welcomeSubtitle: "Välj en utställning",
    noExhibitions: "Inga utställningar tillgängliga",
    errorSetNotFound: "Den här utställningen kunde inte hittas. Den kan ha tagits bort eller så är länken felaktig.",
    errorObjectNotFound: "Det här objektet kunde inte hittas. Försök skanna QR-koden igen.",
    errorLoadFailed: "Något gick fel vid laddningen. Kontrollera din internetanslutning och försök igen.",
    errorUnrecognizedQR: "Den här QR-koden känns inte igen. Se till att du skannar en kod från den här guiden.",
    errorCameraDenied: "Kameraåtkomst nekades. För att skanna QR-koder, tillåt kameraåtkomst i webbläsarens inställningar.",
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
  carouselIndex: 0,
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
  headerLogo: $("#headerLogo"),
  btnList: $("#btnList"),
  btnScan: $("#btnScan"),
  listAboutLink: $("#listAboutLink"),
  listAboutText: $("#listAboutText"),
  btnSettings: $("#btnSettings"),
  bottomNav: $("#bottomNav"),
  labelNavList: $("#labelNavList"),
  labelNavMap: $("#labelNavMap"),
  labelNavScan: $("#labelNavScan"),
  labelNavSettings: $("#labelNavSettings"),
  // Object page
  viewObject: $("#viewObject"),
  carouselContainer: $("#carouselContainer"),
  carouselTrack: $("#carouselTrack"),
  carouselDots: $("#carouselDots"),
  carouselPrev: $("#carouselPrev"),
  carouselNext: $("#carouselNext"),
  subtitlesArea: $("#subtitlesArea"),
  noAudioMessage: $("#noAudioMessage"),
  btnPrevObject: $("#btnPrevObject"),
  btnNextObject: $("#btnNextObject"),
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
  scannerPrompt: $("#scannerPrompt"),
  scannerPromptText: $("#scannerPromptText"),
  btnAllowCamera: $("#btnAllowCamera"),
  scannerVideoContainer: $("#scannerVideoContainer"),
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
  galleryBody: $(".gallery-body"),
  galleryCaption: $("#galleryCaption"),
  btnGalleryPrev: $("#btnGalleryPrev"),
  btnGalleryNext: $("#btnGalleryNext"),
  btnCloseGallery: $("#btnCloseGallery"),
  // Welcome page
  viewWelcome: $("#viewWelcome"),
  welcomeSubtitle: $("#welcomeSubtitle"),
  welcomeSetsList: $("#welcomeSetsList"),
  // About page
  viewAbout: $("#viewAbout"),
  aboutContent: $("#aboutContent"),
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
  document.body.classList.remove("font-xl", "font-xxl", "font-xxxl");
  if (state.settings.fontSize === "xl") document.body.classList.add("font-xl");
  if (state.settings.fontSize === "xxl") document.body.classList.add("font-xxl");
  if (state.settings.fontSize === "xxxl") document.body.classList.add("font-xxxl");

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
  const hintAutoplay = $("#hintAutoplay");
  const hintCaptions = $("#hintCaptionsAloud");
  if (hintAutoplay) hintAutoplay.textContent = t.hintAutoplay;
  if (hintCaptions) hintCaptions.textContent = t.hintCaptionsAloud;
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

  // About link in list view
  dom.listAboutText.textContent = state.currentSet
    ? `${t.aboutTitle} ${state.currentSet[`name_${state.settings.language}`] || state.currentSet.name_en || ""}`
    : t.aboutTitle;

  // Scanner prompt
  dom.scannerPromptText.textContent = t.cameraPrompt;
  dom.btnAllowCamera.textContent = t.allowCamera;

  // Welcome page
  if (dom.welcomeSubtitle) dom.welcomeSubtitle.textContent = t.welcomeSubtitle;

  // Re-render about content if on about view
  if (dom.viewAbout.classList.contains("active")) {
    renderAboutContent();
  }
}

function t(key) {
  return (i18n[state.settings.language] || i18n.en)[key] || key;
}

// ===== API helpers =====
async function api(path) {
  let resp;
  try {
    resp = await fetch(`${PB_URL}/api/collections/${path}`);
  } catch (e) {
    throw new Error(t("errorLoadFailed"));
  }
  if (!resp.ok) throw new Error(t("errorLoadFailed"));
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
    // Show welcome page with list of published sets
    try {
      const resp = await api('sets/records?filter=(published=true)&sort=name_en');
      const lang = state.settings.language;
      dom.welcomeSetsList.innerHTML = '';
      if (resp.items && resp.items.length > 0) {
        for (const set of resp.items) {
          const name = set[`name_${lang}`] || set.name_en || set.slug;
          const desc = set[`description_${lang}`] || set.description_en || "";
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = `#/${set.slug}`;
          a.className = 'welcome-page__set-link';
          a.innerHTML = `<span class="welcome-page__set-name">${escapeHtml(name)}</span>${desc ? `<span class="welcome-page__set-desc">${escapeHtml(desc)}</span>` : ""}`;
          li.appendChild(a);
          dom.welcomeSetsList.appendChild(li);
        }
      } else {
        dom.welcomeSetsList.innerHTML = `<li style="color:var(--color-text-secondary)">${escapeHtml(t("noExhibitions"))}</li>`;
      }
      showView('welcome');
    } catch (e) {
      showView('welcome');
    }
    return;
  }

  document.getElementById('loadingIndicator').style.display = 'flex';

  try {
    // Load set
    const setsResp = await api(`sets/records?filter=(slug='${encodeURIComponent(route.setSlug)}'%26%26published=true)`);
    if (!setsResp.items || setsResp.items.length === 0) {
      showToast(t("errorSetNotFound"), true);
      return;
    }
    state.currentSet = setsResp.items[0];
    applySetColors(state.currentSet);
    applySetFonts(state.currentSet);

    // Logo
    if (state.currentSet.logo) {
      dom.headerLogo.src = fileUrl("sets", state.currentSet.id, state.currentSet.logo);
      dom.headerLogo.classList.remove("hidden");
    } else {
      dom.headerLogo.classList.add("hidden");
    }

    // About button: only show if set has about content
    const hasAbout = !!(state.currentSet.about_en || state.currentSet.about_sv);
    dom.listAboutLink.classList.toggle("hidden", !hasAbout);

    // Load all objects in this set
    const objResp = await api(`objects/records?filter=(set='${state.currentSet.id}')&sort=sort_order&perPage=200`);
    state.objects = objResp.items || [];

    if (route.objectSlug) {
      const obj = state.objects.find((o) => o.slug === route.objectSlug);
      if (obj) {
        await loadObject(obj);
        updateSequentialNav();
        showView("object");
      } else {
        showToast(t("errorObjectNotFound"), true);
        showView("list");
      }
    } else {
      showView("list");
    }
  } catch (err) {
    console.error("Failed to load route:", err);
    showToast(t("errorLoadFailed"), true);
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

  // Render image carousel
  if (state.images.length > 0) {
    state.carouselIndex = 0;
    renderCarousel();
    dom.carouselContainer.classList.remove("hidden");
  } else {
    dom.carouselTrack.innerHTML = "";
    dom.carouselContainer.classList.add("hidden");
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
    // Show images if available, otherwise just the message
    if (state.images && state.images.length > 0) {
      const isSingle = state.images.length === 1;
      const imgHtml = state.images.map(img => {
        const url = fileUrl("object_images", img.id, img.image);
        const maxH = isSingle ? "max-height:60vh;" : "";
        return `<img src="${url}" alt="" style="max-width:100%;${maxH}border-radius:8px;margin-bottom:var(--spacing-sm);object-fit:contain">`;
      }).join("");
      dom.noAudioMessage.innerHTML = `<div style="padding:var(--spacing-md);text-align:center">
        <p style="margin-bottom:var(--spacing-md);color:var(--color-text-secondary);font-style:italic">${escapeHtml(t("noAudio"))}</p>
        ${imgHtml}
      </div>`;
    } else {
      dom.noAudioMessage.textContent = t("noAudio");
    }
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
    div.innerHTML = escapeHtml(cue.text);
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
  let activeIdx = -1;

  cueElements.forEach((el, i) => {
    const cue = state.subtitleCues[i];
    const isActive = cue && time >= cue.start && time < cue.end;
    el.classList.toggle("active", isActive);
    el.classList.remove("next");
    if (isActive) activeIdx = i;
  });

  // Auto-scroll to active cue
  if (activeIdx >= 0) {
    cueElements[activeIdx].scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// ===== Image Carousel =====
function renderCarousel() {
  const lang = state.settings.language;
  dom.carouselTrack.innerHTML = "";
  dom.carouselDots.innerHTML = "";

  const isSingle = state.images.length === 1;
  dom.carouselContainer.classList.toggle("carousel--single", isSingle);

  for (let i = 0; i < state.images.length; i++) {
    const img = state.images[i];
    const url = fileUrl("object_images", img.id, img.image);
    const caption = img[`caption_${lang}`] || img.caption_en || "";
    const slide = document.createElement("div");
    slide.className = "carousel__slide";
    const imgEl = document.createElement("img");
    imgEl.src = url;
    imgEl.alt = caption || `Image ${i + 1}`;
    imgEl.loading = i === 0 ? "eager" : "lazy";
    imgEl.addEventListener("click", () => openGallery(i));
    slide.appendChild(imgEl);
    dom.carouselTrack.appendChild(slide);

    if (!isSingle) {
      const dot = document.createElement("button");
      dot.className = "carousel__dot" + (i === 0 ? " active" : "");
      dot.setAttribute("aria-label", `Image ${i + 1}`);
      dot.addEventListener("click", () => scrollCarouselTo(i));
      dom.carouselDots.appendChild(dot);
    }
  }

  updateCarouselArrows();
}

function scrollCarouselTo(index) {
  state.carouselIndex = Math.max(0, Math.min(index, state.images.length - 1));
  const slide = dom.carouselTrack.children[state.carouselIndex];
  if (slide) {
    slide.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }
  updateCarouselArrows();
  updateCarouselDots();
}

function updateCarouselArrows() {
  if (state.images.length <= 1) {
    dom.carouselPrev.classList.add("hidden");
    dom.carouselNext.classList.add("hidden");
    return;
  }
  dom.carouselPrev.classList.toggle("hidden", state.carouselIndex <= 0);
  dom.carouselNext.classList.toggle("hidden", state.carouselIndex >= state.images.length - 1);
}

function updateCarouselDots() {
  const dots = dom.carouselDots.querySelectorAll(".carousel__dot");
  dots.forEach((dot, i) => dot.classList.toggle("active", i === state.carouselIndex));
}

function setupCarouselEvents() {
  dom.carouselPrev.addEventListener("click", (e) => {
    e.stopPropagation();
    scrollCarouselTo(state.carouselIndex - 1);
  });
  dom.carouselNext.addEventListener("click", (e) => {
    e.stopPropagation();
    scrollCarouselTo(state.carouselIndex + 1);
  });

  // Swipe support
  let touchStartX = 0;
  dom.carouselTrack.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  dom.carouselTrack.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      if (dx < 0) scrollCarouselTo(state.carouselIndex + 1);
      else scrollCarouselTo(state.carouselIndex - 1);
    }
  });

  // Track scroll position to update index and dots
  let scrollTimeout = null;
  dom.carouselTrack.addEventListener("scroll", () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const slides = dom.carouselTrack.children;
      if (slides.length === 0) return;
      const trackLeft = dom.carouselTrack.scrollLeft;
      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < slides.length; i++) {
        const dist = Math.abs(slides[i].offsetLeft - trackLeft);
        if (dist < closestDist) { closestDist = dist; closest = i; }
      }
      state.carouselIndex = closest;
      updateCarouselArrows();
      updateCarouselDots();
    }, 100);
  });
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

  audio.addEventListener("ended", () => {
    // Show "next object" prompt if sequential navigation is enabled
    if (state.currentSet && state.currentSet.sequential_navigation && state.currentObject) {
      const idx = state.objects.findIndex(o => o.id === state.currentObject.id);
      if (idx >= 0 && idx + 1 < state.objects.length) {
        const nextObj = state.objects[idx + 1];
        const lang = state.settings.language;
        const name = nextObj[`name_${lang}`] || nextObj.name_en || "Object";
        showToast(`${t("nextObject")}: ${name}`);
      }
    }
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

  // Playback speed control
  const speeds = [1, 1.25, 1.5, 2, 0.75];
  let speedIndex = 0;

  dom.btnPlaybackSpeed.addEventListener("click", () => {
    speedIndex = (speedIndex + 1) % speeds.length;
    const speed = speeds[speedIndex];
    audio.playbackRate = speed;
    dom.btnPlaybackSpeed.textContent = speed + "x";
  });

  // Reset speed when loading new audio
  audio.addEventListener("loadedmetadata", () => {
    speedIndex = 0;
    audio.playbackRate = 1;
    dom.btnPlaybackSpeed.textContent = "1x";
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
  // Gallery open is handled by carousel image clicks (passes the index)
  dom.carouselContainer.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openGallery(state.carouselIndex);
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

  // Gallery pinch-to-zoom, double-tap zoom, and swipe
  let galleryZoom = 1;
  let galleryPan = { x: 0, y: 0 };
  let galleryPinchDist = 0;
  let galleryPointers = new Map();
  let galleryLastTap = 0;
  let galleryTouchStartX = 0;
  let galleryTouchStartY = 0;
  let galleryTouchStartTime = 0;

  function resetGalleryZoom() {
    galleryZoom = 1;
    galleryPan = { x: 0, y: 0 };
    dom.galleryImage.style.transform = "";
  }

  function applyGalleryTransform() {
    dom.galleryImage.style.transform = `translate(${galleryPan.x}px, ${galleryPan.y}px) scale(${galleryZoom})`;
  }

  // Reset zoom when switching images
  const origRender = renderGalleryImage;
  renderGalleryImage = function() {
    resetGalleryZoom();
    origRender();
  };

  dom.galleryBody.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".gallery-nav")) return;
    galleryPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dom.galleryBody.setPointerCapture(e.pointerId);
    if (galleryPointers.size === 2) {
      const [a, b] = [...galleryPointers.values()];
      galleryPinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    }
    if (galleryPointers.size === 1) {
      galleryTouchStartX = e.clientX;
      galleryTouchStartY = e.clientY;
      galleryTouchStartTime = Date.now();
    }
  });

  dom.galleryBody.addEventListener("pointermove", (e) => {
    if (!galleryPointers.has(e.pointerId)) return;
    const prev = galleryPointers.get(e.pointerId);
    galleryPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (galleryPointers.size === 1 && galleryZoom > 1) {
      galleryPan.x += e.clientX - prev.x;
      galleryPan.y += e.clientY - prev.y;
      applyGalleryTransform();
    } else if (galleryPointers.size === 2 && galleryPinchDist > 0) {
      const [a, b] = [...galleryPointers.values()];
      const newDist = Math.hypot(a.x - b.x, a.y - b.y);
      const ratio = newDist / galleryPinchDist;
      galleryZoom = Math.max(1, Math.min(5, galleryZoom * ratio));
      galleryPinchDist = newDist;
      if (galleryZoom <= 1) galleryPan = { x: 0, y: 0 };
      applyGalleryTransform();
    }
  });

  dom.galleryBody.addEventListener("pointerup", (e) => {
    galleryPointers.delete(e.pointerId);
    if (galleryPointers.size < 2) galleryPinchDist = 0;

    // Single-finger release: handle swipe or double-tap
    if (galleryPointers.size === 0 && galleryZoom <= 1) {
      const dx = e.clientX - galleryTouchStartX;
      const dy = e.clientY - galleryTouchStartY;
      const dt = Date.now() - galleryTouchStartTime;

      // Swipe to navigate (only when not zoomed)
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 500) {
        if (dx < 0 && state.galleryIndex < state.images.length - 1) {
          state.galleryIndex++;
          renderGalleryImage();
        } else if (dx > 0 && state.galleryIndex > 0) {
          state.galleryIndex--;
          renderGalleryImage();
        }
      }

      // Double-tap to zoom
      const now = Date.now();
      if (now - galleryLastTap < 300 && Math.abs(dx) < 10) {
        galleryZoom = 2.5;
        applyGalleryTransform();
      }
      galleryLastTap = now;
    }

    // Snap back if zoomed out
    if (galleryZoom <= 1) resetGalleryZoom();
  });

  dom.galleryBody.addEventListener("pointercancel", (e) => {
    galleryPointers.delete(e.pointerId);
    if (galleryPointers.size < 2) galleryPinchDist = 0;
  });
}

// ===== About Page =====
function renderAboutContent() {
  if (!state.currentSet) return;
  const lang = state.settings.language;
  const content = state.currentSet[`about_${lang}`] || state.currentSet.about_en || "";
  dom.aboutContent.innerHTML = content;
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
  // Show prompt screen first, hide video container
  dom.scannerPrompt.classList.remove("hidden");
  dom.scannerVideoContainer.classList.add("hidden");
  dom.scannerPromptText.textContent = t("cameraPrompt");
  dom.btnAllowCamera.textContent = t("allowCamera");
}

async function activateCamera() {
  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    // Hide prompt, show video
    dom.scannerPrompt.classList.add("hidden");
    dom.scannerVideoContainer.classList.remove("hidden");
    dom.scannerVideo.srcObject = scannerStream;
    scannerCanvas = document.createElement("canvas");
    scannerCtx = scannerCanvas.getContext("2d");
    state.scannerActive = true;
    scanFrame();
  } catch (e) {
    console.error("Camera access denied:", e);
    showToast(t("errorCameraDenied"), true);
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

  // Reset scanner frame styles (in case QR feedback changed them)
  const frame = document.querySelector('.scanner-frame');
  if (frame) {
    frame.style.borderColor = '';
    frame.style.boxShadow = '';
  }
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
    showScannerToast(t("errorUnrecognizedQR"));
    return;
  }

  if (url.host !== currentHost) {
    showScannerToast(t("errorUnrecognizedQR"));
    return;
  }

  // Parse hash-based route: /#/set-slug/object-slug
  const hash = (url.hash || "").replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);
  let setSlug = null;
  let objectSlug = null;

  if (parts.length >= 2) {
    setSlug = parts[0];
    objectSlug = parts[1];
  } else {
    // Also support path-based URLs for backwards compat
    const pathParts = url.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      setSlug = pathParts[0];
      objectSlug = pathParts[1];
    }
  }

  if (setSlug && objectSlug) {
    // Add subtle vibration feedback
    if (navigator.vibrate) navigator.vibrate(100);

    // Brief visual feedback - flash the scanner frame green
    const frame = document.querySelector('.scanner-frame');
    if (frame) {
      frame.style.borderColor = '#4caf50';
      frame.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(76, 175, 80, 0.5)';
    }

    // Short delay before navigating for feedback to register
    state.scannerActive = false; // Stop scanning immediately
    setTimeout(() => {
      stopScanner();
      navigateTo(setSlug, objectSlug);
    }, 300);
  } else {
    showScannerToast(t("errorUnrecognizedQR"));
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
  dom.btnList.classList.toggle("btn--active", name === "list" || name === "welcome");
  dom.btnMapView.classList.toggle("btn--active", name === "map");
  dom.btnScan.classList.toggle("btn--active", name === "scanner");

  // Header title: "Augus" on welcome, set name on list/map views, object name stays on object view
  if (name === "welcome") {
    dom.headerTitle.textContent = "Augus";
    document.title = "Augus";
    dom.headerLogo.classList.add("hidden");
  } else if (name === "about" && state.currentSet) {
    const lang = state.settings.language;
    const aboutLabel = (i18n[lang] || i18n.en).aboutTitle;
    const setName = state.currentSet[`name_${lang}`] || state.currentSet.name_en || "";
    const aboutTitle = `${aboutLabel} ${setName}`;
    dom.headerTitle.textContent = aboutTitle;
    document.title = `${aboutTitle} — Augus`;
  } else if ((name === "list" || name === "map") && state.currentSet) {
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
    case "welcome":
      dom.viewWelcome.classList.add("active");
      break;
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
    case "about":
      dom.viewAbout.classList.add("active");
      renderAboutContent();
      break;
  }
}

function getCurrentView() {
  if (dom.viewWelcome.classList.contains("active")) return "welcome";
  if (dom.viewObject.classList.contains("active")) return "object";
  if (dom.viewList.classList.contains("active")) return "list";
  if (dom.viewMap.classList.contains("active")) return "map";
  if (dom.viewScanner.classList.contains("active")) return "scanner";
  if (dom.viewAbout.classList.contains("active")) return "about";
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
      // Reload current object with new language (only if viewing it)
      if (state.currentObject && oldLang !== state.settings.language && dom.viewObject.classList.contains("active")) {
        loadObject(state.currentObject);
      }
      if (dom.viewList.classList.contains("active")) renderObjectList();
      if (dom.viewMap.classList.contains("active")) renderMapView();
      if (dom.viewAbout.classList.contains("active")) {
        renderAboutContent();
        const aboutLabel = (i18n[state.settings.language] || i18n.en).aboutTitle;
        const setName = state.currentSet[`name_${state.settings.language}`] || state.currentSet.name_en || "";
        const aboutTitle = `${aboutLabel} ${setName}`;
        dom.headerTitle.textContent = aboutTitle;
        document.title = `${aboutTitle} — Augus`;
      }
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

  dom.listAboutLink.addEventListener("click", (e) => {
    e.preventDefault();
    showView("about");
  });

  dom.btnMapView.addEventListener("click", () => showView("map"));

  // Prev/Next object navigation
  dom.btnPrevObject.addEventListener("click", () => navigateSequential(-1));
  dom.btnNextObject.addEventListener("click", () => navigateSequential(1));

  // Browser back/forward (hash-based routing)
  window.addEventListener("hashchange", () => loadRoute());
}

function navigateSequential(direction) {
  if (!state.currentObject || !state.currentSet) return;
  const idx = state.objects.findIndex(o => o.id === state.currentObject.id);
  const nextIdx = idx + direction;
  if (nextIdx >= 0 && nextIdx < state.objects.length) {
    navigateTo(state.currentSet.slug, state.objects[nextIdx].slug);
  }
}

function updateSequentialNav() {
  const enabled = state.currentSet && state.currentSet.sequential_navigation;
  if (!enabled || !state.currentObject) {
    dom.btnPrevObject.classList.add("hidden");
    dom.btnNextObject.classList.add("hidden");
    return;
  }
  const idx = state.objects.findIndex(o => o.id === state.currentObject.id);
  dom.btnPrevObject.classList.toggle("hidden", idx <= 0);
  dom.btnNextObject.classList.toggle("hidden", idx >= state.objects.length - 1);
}

// ===== Toast =====
let toastTimeout = null;
function showToast(msg, isError = false) {
  if (toastTimeout) clearTimeout(toastTimeout);
  dom.toast.textContent = msg;
  dom.toast.classList.toggle("toast--error", isError);
  dom.toast.classList.add("visible");
  if (isError) {
    // Error toasts persist — user must tap to dismiss
    dom.toast.style.pointerEvents = "auto";
    dom.toast.onclick = () => {
      dom.toast.classList.remove("visible");
      dom.toast.style.pointerEvents = "";
      dom.toast.onclick = null;
    };
  } else {
    dom.toast.style.pointerEvents = "";
    dom.toast.onclick = null;
    toastTimeout = setTimeout(() => dom.toast.classList.remove("visible"), 3000);
  }
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

function applySetFonts(set) {
  // Custom font via @font-face
  let fontStyleEl = document.getElementById('customFontStyle');
  if (!fontStyleEl) {
    fontStyleEl = document.createElement('style');
    fontStyleEl.id = 'customFontStyle';
    document.head.appendChild(fontStyleEl);
  }

  if (set.custom_font) {
    const fontUrl = fileUrl("sets", set.id, set.custom_font);
    fontStyleEl.textContent = `
      @font-face {
        font-family: 'CustomSetFont';
        src: url('${fontUrl}');
        font-display: swap;
      }
      body {
        --font-family: 'CustomSetFont', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
    `;
  } else {
    fontStyleEl.textContent = '';
  }

  // Subtitle font
  const subtitleFont = set.subtitle_font;

  // Load Google Fonts if needed
  const googleFonts = ['Atkinson Hyperlegible Next', 'OpenDyslexic', 'Lexend'];
  let googleFontLink = document.getElementById('subtitleGoogleFont');
  if (subtitleFont && googleFonts.includes(subtitleFont)) {
    if (!googleFontLink) {
      googleFontLink = document.createElement('link');
      googleFontLink.id = 'subtitleGoogleFont';
      googleFontLink.rel = 'stylesheet';
      document.head.appendChild(googleFontLink);
    }
    const fontParam = subtitleFont.replace(/ /g, '+');
    googleFontLink.href = `https://fonts.googleapis.com/css2?family=${fontParam}&display=swap`;
  } else if (googleFontLink) {
    googleFontLink.remove();
  }

  if (subtitleFont) {
    document.documentElement.style.setProperty('--subtitle-font', `'${subtitleFont}', var(--font-family)`);
  } else {
    document.documentElement.style.removeProperty('--subtitle-font');
  }
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
  setupCarouselEvents();
  setupSettingsEvents();
  setupNavigationEvents();
  setupMapEvents();

  // Camera pre-prompt: allow button triggers actual camera access
  dom.btnAllowCamera.addEventListener("click", () => activateCamera());

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
