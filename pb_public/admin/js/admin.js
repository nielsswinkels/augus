// ============================================
// Augus — Admin Application
// ============================================

const PB_URL = window.location.origin;

// ===== State =====
let authToken = sessionStorage.getItem("augus_admin_token") || "";
let currentSets = [];
let currentObjects = [];
let currentFloors = [];
let editingSet = null;
let editingObject = null;
let selectedSetId = "";
let formDirty = false;
let adminMapInstance = null;
let adminMapMarker = null;
let adminRadiusCircle = null;
let objectPickerFloors = [];
let editingSetContent = {};    // { "en": {id, name, description, about}, "sv": {id, ...} }
let editingObjectContent = {}; // { "en": {id, name, description, audio, subtitles}, "sv": {id, ...} }
let editingSetLanguages = [];  // ["en", "sv", ...]

// ===== Language Names =====
const LANGUAGE_NAMES = {
  en: "English", sv: "Svenska", de: "Deutsch",
  fr: "Français", es: "Español", it: "Italiano",
  nl: "Nederlands", da: "Dansk", no: "Norsk",
  fi: "Suomi", pt: "Português", zh: "中文",
  ja: "日本語", ko: "한국어", ar: "العربية",
  pl: "Polski", cs: "Čeština", ru: "Русский",
  uk: "Українська", tr: "Türkçe", el: "Ελληνικά",
  he: "עברית", hi: "हिन्दी", th: "ไทย",
};

function langName(code) {
  return LANGUAGE_NAMES[code] || code.toUpperCase();
}

// ===== Leaflet Lazy Loader =====
function loadLeaflet() {
  if (window._leafletPromise) return window._leafletPromise;
  window._leafletPromise = new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/js/lib/leaflet/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "/js/lib/leaflet/leaflet.js";
    script.onload = () => resolve(window.L);
    document.head.appendChild(script);
  });
  return window._leafletPromise;
}

// ===== DOM =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== API =====
// CSRF protection: The Authorization header provides implicit CSRF protection
// because custom headers cannot be set by cross-origin form submissions.
async function api(path, options = {}) {
  const headers = { ...options.headers };
  if (authToken) headers["Authorization"] = "Bearer " + authToken;

  const resp = await fetch(`${PB_URL}/api/${path}`, { ...options, headers });
  if (resp.status === 401 || resp.status === 403) {
    logout();
    throw new Error("Unauthorized");
  }
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    let msg = err.message || `API error: ${resp.status}`;
    if (err.data) {
      const fields = Object.entries(err.data).map(([k, v]) => `${k}: ${v.message || JSON.stringify(v)}`).join("; ");
      if (fields) msg += " — " + fields;
    }
    throw new Error(msg);
  }
  if (resp.status === 204) return null;
  return resp.json();
}

function fileUrl(collection, recordId, filename) {
  return `${PB_URL}/api/files/${collection}/${recordId}/${filename}`;
}

// ===== Auth =====
async function login(email, password) {
  const data = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: email, password }),
  });

  if (!data.ok) {
    // Try superuser collection (PocketBase 0.23+)
    const data2 = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: email, password }),
    });
    if (!data2.ok) throw new Error("Invalid credentials");
    const result = await data2.json();
    authToken = result.token;
    sessionStorage.setItem("augus_admin_token", authToken);
    return;
  }

  const result = await data.json();
  authToken = result.token;
  sessionStorage.setItem("augus_admin_token", authToken);
}

function logout() {
  authToken = "";
  sessionStorage.removeItem("augus_admin_token");
  showLogin();
}

function showLogin() {
  $("#loginScreen").classList.remove("hidden");
  $("#adminApp").classList.add("hidden");
}

function showApp() {
  $("#loginScreen").classList.add("hidden");
  $("#adminApp").classList.remove("hidden");
  loadSets();
}

// ===== Tab Navigation =====
function showTab(tab) {
  $$(".admin-nav__tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));

  // Hide all panels except form panels
  $("#panelSets").classList.toggle("hidden", tab !== "sets");
  $("#panelSetForm").classList.add("hidden");
  $("#panelObjects").classList.toggle("hidden", tab !== "objects");
  $("#panelObjectForm").classList.add("hidden");

  if (tab === "sets") loadSets();
  if (tab === "objects") loadObjectSetFilter();
}

// ===== SETS =====
async function loadSets() {
  try {
    const resp = await api("collections/sets/records?sort=name_en&perPage=200");
    currentSets = resp.items || [];
    // Load content for set names in list
    const setContentResp = await api("collections/set_content/records?perPage=500");
    const allSetContent = setContentResp.items || [];
    for (const s of currentSets) {
      s._content = {};
      for (const c of allSetContent) {
        if (c.set === s.id) s._content[c.language] = c;
      }
    }
    renderSetsList();
  } catch (e) {
    showToast("Could not load sets. Please check your connection and try refreshing the page.");
  }
}

function getSetDisplayName(set) {
  if (set._content) {
    const langs = Object.keys(set._content);
    for (const l of langs) {
      if (set._content[l].name) return set._content[l].name;
    }
  }
  return set.name_en || set.name_sv || "(Untitled)";
}

function renderSetsList() {
  const container = $("#setsList");
  container.innerHTML = "";
  if (currentSets.length === 0) {
    container.innerHTML = '<p style="color:var(--color-text-secondary)">No sets yet. Create one!</p>';
    return;
  }
  for (const set of currentSets) {
    const card = document.createElement("div");
    card.className = "set-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.innerHTML = `
      <div class="set-card__info">
        <div class="set-card__name">${esc(getSetDisplayName(set))}${set.published ? "" : ' <span class="set-card__draft">Draft</span>'}</div>
        <div class="set-card__slug">/${esc(set.slug)}</div>
      </div>
    `;
    card.addEventListener("click", () => editSet(set));
    card.addEventListener("keydown", (e) => { if (e.key === "Enter") editSet(set); });
    container.appendChild(card);
  }
}

async function editSet(set) {
  editingSet = set;
  formDirty = false;
  resetConfirmButton($("#btnDeleteSet"));
  $("#setFormTitle").textContent = set ? "Edit Set" : "New Set";
  $("#panelSets").classList.add("hidden");
  $("#panelSetForm").classList.remove("hidden");

  if (set) {
    $("#setFormId").value = set.id;
    $("#setSlug").value = set.slug;
    $("#btnDeleteSet").classList.remove("hidden");
    $("#btnGoToObjects").style.display = "";

    // Load content from content table
    const contentResp = await api(`collections/set_content/records?filter=(set='${set.id}')&perPage=50`);
    editingSetContent = {};
    for (const c of (contentResp.items || [])) {
      editingSetContent[c.language] = c;
    }
    editingSetLanguages = set.available_languages || ["en", "sv"];

    if (set.logo) {
      $("#setLogoCurrent").innerHTML = `Current: ${esc(set.logo)} <button class="current-file__remove" data-field="logo" title="Remove">&times;</button>`;
      $("#setLogoCurrent").classList.remove("hidden");
    } else {
      $("#setLogoCurrent").classList.add("hidden");
    }
    $("#setLogo").value = "";

    $("#setCustomFont").value = "";
    if (set.custom_font) {
      $("#setCustomFontCurrent").innerHTML = `Current: ${esc(set.custom_font)} <button class="current-file__remove" data-field="custom_font" title="Remove">&times;</button>`;
      $("#setCustomFontCurrent").classList.remove("hidden");
    } else {
      $("#setCustomFontCurrent").classList.add("hidden");
    }
    $("#setSubtitleFont").value = set.subtitle_font || "Atkinson Hyperlegible Next";

    $("#setPublished").checked = !!set.published;
    $("#setSequentialNav").checked = !!set.sequential_navigation;
    $("#setShowNumbers").checked = set.show_numbers !== false;

    $("#floorsFieldset").style.display = "";
    loadFloors(set.id);
    loadGroups(set.id);

    const primary = set.color_primary || "#0057b8";
    const accent = set.color_accent || "#ffffff";
    $("#setColorPrimary").value = primary;
    $("#setColorPrimaryText").value = primary;
    $("#setColorAccent").value = accent;
    $("#setColorAccentText").value = accent;
  } else {
    $("#setFormId").value = "";
    $("#setSlug").value = "";
    $("#setLogo").value = "";
    $("#setLogoCurrent").classList.add("hidden");
    $("#setCustomFont").value = "";
    $("#setCustomFontCurrent").classList.add("hidden");
    $("#setSubtitleFont").value = "Atkinson Hyperlegible Next";
    $("#setColorPrimary").value = "#0057b8";
    $("#setColorPrimaryText").value = "#0057b8";
    $("#setColorAccent").value = "#ffffff";
    $("#setColorAccentText").value = "#ffffff";
    $("#setPublished").checked = false;
    $("#setSequentialNav").checked = true;
    $("#setShowNumbers").checked = true;
    $("#btnDeleteSet").classList.add("hidden");
    $("#btnGoToObjects").style.display = "none";
    $("#floorsFieldset").style.display = "none";
    editingSetContent = {};
    editingSetLanguages = ["en"];
  }
  renderSetLanguages();
}

// ===== Dynamic Language Management for Sets =====
function renderSetLanguages() {
  // Render language tags
  const tagsContainer = $("#setLanguageTags");
  tagsContainer.innerHTML = "";
  for (const lang of editingSetLanguages) {
    const tag = document.createElement("span");
    tag.className = "language-tag";
    tag.innerHTML = `${esc(langName(lang))} <button type="button" class="language-tag__remove" data-lang="${esc(lang)}" title="Remove ${esc(langName(lang))}">&times;</button>`;
    tag.querySelector("button").addEventListener("click", () => removeSetLanguage(lang));
    tagsContainer.appendChild(tag);
  }

  // Render add-language dropdown (exclude already added)
  const select = $("#setAddLanguage");
  select.innerHTML = "";
  for (const [code, name] of Object.entries(LANGUAGE_NAMES)) {
    if (!editingSetLanguages.includes(code)) {
      select.innerHTML += `<option value="${code}">${esc(name)} (${code})</option>`;
    }
  }

  // Render content fieldsets
  renderSetContentFieldsets();
}

function addSetLanguage() {
  const code = $("#setAddLanguage").value;
  if (!code || editingSetLanguages.includes(code)) return;
  editingSetLanguages.push(code);
  renderSetLanguages();
  formDirty = true;
}

function removeSetLanguage(code) {
  if (editingSetLanguages.length <= 1) {
    showToast("At least one language is required.");
    return;
  }
  if (editingSetContent[code] && (editingSetContent[code].name || editingSetContent[code].description || editingSetContent[code].about)) {
    if (!confirm(`"${langName(code)}" has content. Removing it will delete that content when you save. Continue?`)) return;
  }
  editingSetLanguages = editingSetLanguages.filter(l => l !== code);
  renderSetLanguages();
  formDirty = true;
}

let quillInstances = {};

function renderSetContentFieldsets() {
  const container = $("#setContentFieldsets");
  container.innerHTML = "";
  quillInstances = {};
  for (const lang of editingSetLanguages) {
    const content = editingSetContent[lang] || {};
    const fieldset = document.createElement("fieldset");
    fieldset.className = "form-fieldset";
    fieldset.innerHTML = `
      <legend class="form-fieldset__toggle" onclick="this.closest('.form-fieldset').classList.toggle('collapsed')">${esc(langName(lang))} (${lang})</legend>
      <label class="form-label">Name ${editingSetLanguages.indexOf(lang) === 0 ? '<span class="required">*</span>' : ""}</label>
      <input type="text" class="form-input set-content-name" data-lang="${lang}" value="${esc(content.name || "")}" ${editingSetLanguages.indexOf(lang) === 0 ? "required" : ""}>
      <label class="form-label">Description</label>
      <textarea class="form-input form-textarea set-content-desc" data-lang="${lang}">${esc(content.description || "")}</textarea>
      <label class="form-label">About page</label>
      <div class="quill-editor" data-lang="${lang}"></div>
    `;
    container.appendChild(fieldset);

    if (typeof Quill !== "undefined") {
      const editorEl = fieldset.querySelector(`.quill-editor[data-lang="${lang}"]`);
      const quill = new Quill(editorEl, {
        theme: "bubble",
        placeholder: "Write about this exhibition...",
        modules: {
          toolbar: [
            ["bold", "italic", "underline"],
            ["link"],
            [{ header: [2, 3, false] }],
            ["clean"],
          ],
        },
      });
      if (content.about) quill.root.innerHTML = content.about;
      quillInstances[lang] = quill;
    }
  }
}

async function saveSet(e) {
  e.preventDefault();
  if (!validateRequiredFields($("#setForm"))) return;
  const id = $("#setFormId").value;
  const slug = $("#setSlug").value.trim();
  const reserved = ["admin", "api", "_", "js", "css"];
  if (reserved.includes(slug)) {
    showToast(`"${slug}" is reserved by the system. Please choose a different slug.`);
    return;
  }
  const formData = new FormData();
  formData.append("slug", slug);
  // Keep name_en for backward compatibility / sorting
  const firstLangName = document.querySelector(".set-content-name")?.value.trim() || "";
  formData.append("name_en", firstLangName);

  const logoFile = $("#setLogo").files[0];
  if (logoFile) formData.append("logo", logoFile);

  const fontFile = $("#setCustomFont").files[0];
  if (fontFile) formData.append("custom_font", fontFile);
  formData.append("subtitle_font", $("#setSubtitleFont").value);

  const primaryVal = $("#setColorPrimaryText").value;
  const accentVal = $("#setColorAccentText").value;
  formData.append("color_primary", /^#[0-9a-fA-F]{6}$/.test(primaryVal) ? primaryVal : $("#setColorPrimary").value);
  formData.append("color_accent", /^#[0-9a-fA-F]{6}$/.test(accentVal) ? accentVal : $("#setColorAccent").value);
  formData.append("default_floor", $("#setDefaultFloor").value);

  try {
    let savedSetId;
    if (id) {
      await api(`collections/sets/records/${id}`, { method: "PATCH", body: formData });
      savedSetId = id;
    } else {
      const result = await api("collections/sets/records", { method: "POST", body: formData });
      savedSetId = result.id;
    }
    // Save booleans + available_languages as JSON
    await api(`collections/sets/records/${savedSetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        published: $("#setPublished").checked,
        sequential_navigation: $("#setSequentialNav").checked,
        show_numbers: $("#setShowNumbers").checked,
        available_languages: editingSetLanguages,
      }),
    });

    // Save content for each language
    for (const lang of editingSetLanguages) {
      const nameEl = document.querySelector(`.set-content-name[data-lang="${lang}"]`);
      const descEl = document.querySelector(`.set-content-desc[data-lang="${lang}"]`);
      const quill = quillInstances[lang];
      const aboutHtml = quill ? quill.root.innerHTML : "";
      const aboutClean = aboutHtml === "<p><br></p>" ? "" : aboutHtml;
      const contentData = {
        set: savedSetId,
        language: lang,
        name: nameEl?.value.trim() || "",
        description: descEl?.value.trim() || "",
        about: aboutClean,
      };
      const existing = editingSetContent[lang];
      if (existing && existing.id) {
        await api(`collections/set_content/records/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contentData),
        });
      } else {
        const created = await api("collections/set_content/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contentData),
        });
        editingSetContent[lang] = created;
      }
    }

    // Delete content rows for removed languages
    for (const lang of Object.keys(editingSetContent)) {
      if (!editingSetLanguages.includes(lang) && editingSetContent[lang].id) {
        await api(`collections/set_content/records/${editingSetContent[lang].id}`, { method: "DELETE" });
        delete editingSetContent[lang];
      }
    }

    showToast("Set saved!");
    formDirty = false;
    showTab("sets");
  } catch (e) {
    showToast("Could not save the set. Please check that all required fields are filled in and try again.");
  }
}

function deleteSet() {
  if (!editingSet) return;
  confirmAction($("#btnDeleteSet"), async () => {
    try {
      await api(`collections/sets/records/${editingSet.id}`, { method: "DELETE" });
      showToast("Set deleted");
      formDirty = false;
      showTab("sets");
    } catch (e) {
      showToast("Could not delete this set. It may still have objects — delete those first.");
    }
  });
}

// ===== OBJECTS =====
async function loadObjectSetFilter() {
  try {
    const resp = await api("collections/sets/records?sort=name_en&perPage=200");
    currentSets = resp.items || [];
    // Load content for display names
    const setContentResp = await api("collections/set_content/records?perPage=500");
    const allSetContent = setContentResp.items || [];
    for (const s of currentSets) {
      s._content = {};
      for (const c of allSetContent) {
        if (c.set === s.id) s._content[c.language] = c;
      }
    }
    const select = $("#objectSetFilter");
    select.innerHTML = '<option value="">Select a set...</option>';
    for (const set of currentSets) {
      const opt = document.createElement("option");
      opt.value = set.id;
      opt.textContent = getSetDisplayName(set);
      select.appendChild(opt);
    }
    if (selectedSetId) {
      select.value = selectedSetId;
      loadObjects(selectedSetId);
    }
  } catch (e) {
    showToast("Could not load sets. Please check your connection and try refreshing.");
  }
}

async function loadObjects(setId) {
  if (!setId) {
    currentObjects = [];
    renderObjectsList();
    $("#btnNewObject").classList.add("hidden");
    return;
  }
  selectedSetId = setId;
  try {
    const resp = await api(`collections/objects/records?filter=(set='${encodeURIComponent(setId)}')&sort=sort_order&perPage=200`);
    currentObjects = resp.items || [];
    // Auto-fix numbering gaps (e.g. after deletion)
    if (currentObjects.length > 0) {
      let needsFix = false;
      for (let i = 0; i < currentObjects.length; i++) {
        if (currentObjects[i].sort_order !== i + 1) { needsFix = true; break; }
      }
      if (needsFix) {
        const updates = [];
        for (let i = 0; i < currentObjects.length; i++) {
          if (currentObjects[i].sort_order !== i + 1) {
            updates.push(
              api(`collections/objects/records/${currentObjects[i].id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sort_order: i + 1 }),
              })
            );
          }
        }
        if (updates.length > 0) {
          try {
            await Promise.all(updates);
            const resp2 = await api(`collections/objects/records?filter=(set='${encodeURIComponent(setId)}')&sort=sort_order&perPage=200`);
            currentObjects = resp2.items || [];
          } catch (e) {
            console.error("Renumber failed:", e);
          }
        }
      }
    }
    // Load display names from object_content
    const objIds = currentObjects.map(o => o.id);
    if (objIds.length > 0) {
      const contentResp = await api(`collections/object_content/records?filter=(object='${objIds.join("'||object='")}')&perPage=500`);
      const allContent = contentResp.items || [];
      for (const obj of currentObjects) {
        const first = allContent.find(c => c.object === obj.id && c.name);
        obj._displayName = first ? first.name : (obj.name_en || "");
      }
    }
    renderObjectsList();
    $("#btnNewObject").classList.remove("hidden");
  } catch (e) {
    showToast("Could not load objects. Please check your connection and try again.");
  }
}

function renderObjectsList() {
  const container = $("#objectsList");
  container.innerHTML = "";
  if (currentObjects.length === 0) {
    container.innerHTML = '<p style="color:var(--color-text-secondary)">No objects yet.</p>';
    return;
  }

  let dragSrcIndex = null;

  for (let i = 0; i < currentObjects.length; i++) {
    const obj = currentObjects[i];
    const card = document.createElement("div");
    card.className = "object-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.draggable = true;
    card.dataset.index = i;
    card.innerHTML = `
      <span class="drag-handle" title="Drag to reorder" aria-hidden="true">⠿</span>
      <div class="object-card__move">
        <button class="btn btn--small object-move-up" data-index="${i}" ${i === 0 ? "disabled" : ""} title="Move up" aria-label="Move up">&#9650;</button>
        <button class="btn btn--small object-move-down" data-index="${i}" ${i === currentObjects.length - 1 ? "disabled" : ""} title="Move down" aria-label="Move down">&#9660;</button>
      </div>
      <span class="object-card__number">${obj.sort_order}</span>
      <div class="object-card__info">
        <div class="object-card__name">${esc(obj._displayName || obj.name_en || "(Untitled)")}${obj.published ? "" : ' <span class="set-card__draft">Draft</span>'}</div>
        <div class="object-card__slug">/${esc(obj.slug)}</div>
      </div>
    `;

    // Open on click/keyboard (but not after a drag)
    let didDrag = false;
    card.addEventListener("click", () => { if (!didDrag) editObject(obj); didDrag = false; });
    card.addEventListener("keydown", (e) => { if (e.key === "Enter") editObject(obj); });

    // Drag-and-drop handlers
    card.addEventListener("dragstart", (e) => {
      didDrag = true;
      dragSrcIndex = parseInt(card.dataset.index);
      e.dataTransfer.effectAllowed = "move";
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
      didDrag = false;
      card.classList.remove("dragging");
      container.querySelectorAll(".object-card").forEach((c) => c.classList.remove("drag-over"));
    });

    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      container.querySelectorAll(".object-card").forEach((c) => c.classList.remove("drag-over"));
      card.classList.add("drag-over");
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("drag-over");
    });

    card.addEventListener("drop", async (e) => {
      e.preventDefault();
      card.classList.remove("drag-over");
      const destIndex = parseInt(card.dataset.index);
      if (dragSrcIndex === null || dragSrcIndex === destIndex) return;

      // Reorder in memory
      const reordered = [...currentObjects];
      const [moved] = reordered.splice(dragSrcIndex, 1);
      reordered.splice(destIndex, 0, moved);

      // Assign new sort_order values (1-based) and save all
      const reorderedWithSort = reordered.map((o, idx) => ({ ...o, sort_order: idx + 1 }));

      try {
        await Promise.all(reorderedWithSort.map((o) =>
          api(`collections/objects/records/${o.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: o.sort_order }),
          })
        ));
        currentObjects = reorderedWithSort;
        renderObjectsList();
      } catch (err) {
        showToast("Could not save the new order. Please try refreshing and reordering again.");
      }
    });

    container.appendChild(card);
  }

  // Wire move up/down buttons
  container.querySelectorAll(".object-move-up, .object-move-down").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      const isUp = btn.classList.contains("object-move-up");
      const swapIdx = isUp ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= currentObjects.length) return;
      const a = currentObjects[idx];
      const b = currentObjects[swapIdx];
      try {
        await Promise.all([
          api(`collections/objects/records/${a.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: b.sort_order }),
          }),
          api(`collections/objects/records/${b.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: a.sort_order }),
          }),
        ]);
        loadObjects(selectedSetId);
      } catch (e) {
        showToast("Could not reorder objects.");
      }
    });
  });
}

async function editObject(obj) {
  editingObject = obj;
  formDirty = false;
  resetConfirmButton($("#btnDeleteObject"));
  $("#objectFormTitle").textContent = obj ? "Edit Object" : "New Object";
  $("#panelObjects").classList.add("hidden");
  $("#panelObjectForm").classList.remove("hidden");

  // Get the set's available languages
  const setId = obj ? obj.set : selectedSetId;
  const parentSet = currentSets.find(s => s.id === setId);
  const setLangs = (parentSet && parentSet.available_languages) || ["en", "sv"];

  // Populate default language dropdown
  const langSelect = $("#objectDefaultLang");
  langSelect.innerHTML = "";
  for (const lang of setLangs) {
    langSelect.innerHTML += `<option value="${lang}">${esc(langName(lang))}</option>`;
  }

  if (obj) {
    $("#objectFormId").value = obj.id;
    $("#objectFormSetId").value = obj.set;
    $("#objectSlug").value = obj.slug;
    $("#objectSortOrder").value = obj.sort_order;
    $("#objectDefaultLang").value = obj.default_language || setLangs[0];
    $("#objectMapX").value = obj.map_x ?? "";
    $("#objectMapY").value = obj.map_y ?? "";
    $("#objectPublished").checked = obj.published !== false;
    $("#btnDeleteObject").classList.remove("hidden");
    $("#btnPreviewObject").classList.remove("hidden");
    $("#btnQRCode").classList.remove("hidden");
    $("#btnDuplicateObject").classList.remove("hidden");

    // Load content from object_content table
    const contentResp = await api(`collections/object_content/records?filter=(object='${obj.id}')&perPage=50`);
    editingObjectContent = {};
    for (const c of (contentResp.items || [])) {
      editingObjectContent[c.language] = c;
    }

    // Load images
    loadObjectImages(obj.id);

    // Set up map picker
    await setupMapPicker(obj);
  } else {
    $("#objectFormId").value = "";
    $("#objectFormSetId").value = selectedSetId;
    $("#objectSlug").value = "";
    $("#objectSortOrder").value = currentObjects.length + 1;
    $("#objectDefaultLang").value = setLangs[0];
    $("#objectMapX").value = "";
    $("#objectMapY").value = "";
    $("#objectPublished").checked = true;
    editingObjectContent = {};
    $("#btnDeleteObject").classList.add("hidden");
    $("#btnPreviewObject").classList.add("hidden");
    $("#btnQRCode").classList.add("hidden");
    $("#btnDuplicateObject").classList.add("hidden");
    $("#imagesGrid").innerHTML = "";
    $("#objectFloorButtons").dataset.selectedFloor = "";
    await setupMapPicker(null);
  }

  renderObjectContentFieldsets(setLangs);
  renderImageCaptionFields(setLangs);

  // Populate group dropdown
  const groupSelect = $("#objectGroup");
  groupSelect.innerHTML = '<option value="">No group</option>';
  if (currentGroups.length > 0) {
    for (const g of currentGroups) {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = getGroupDisplayTitle(g);
      groupSelect.appendChild(opt);
    }
    groupSelect.value = obj ? (obj.group || "") : "";
    $("#objectGroupRow").style.display = "";
  } else {
    $("#objectGroupRow").style.display = "none";
  }
}

function renderImageCaptionFields(langs) {
  const container = $("#imageCaptionFields");
  container.innerHTML = "";
  for (const lang of langs) {
    const div = document.createElement("div");
    div.innerHTML = `
      <label class="form-label">Caption (${esc(langName(lang))})</label>
      <input type="text" class="form-input image-upload-caption" data-lang="${lang}">
    `;
    container.appendChild(div);
  }
}

function renderObjectContentFieldsets(langs) {
  const container = $("#objectContentFieldsets");
  container.innerHTML = "";
  for (const lang of langs) {
    const content = editingObjectContent[lang] || {};
    const fieldset = document.createElement("fieldset");
    fieldset.className = "form-fieldset";
    fieldset.innerHTML = `
      <legend class="form-fieldset__toggle" onclick="this.closest('.form-fieldset').classList.toggle('collapsed')">${esc(langName(lang))} (${lang})</legend>
      <label class="form-label">Name ${langs.indexOf(lang) === 0 ? '<span class="required">*</span>' : ""}</label>
      <input type="text" class="form-input obj-content-name" data-lang="${lang}" value="${esc(content.name || "")}" ${langs.indexOf(lang) === 0 ? "required" : ""}>
      <label class="form-label">Audio (MP3)</label>
      <input type="file" class="form-input obj-content-audio" data-lang="${lang}" accept="audio/mpeg,audio/mp3,audio/ogg">
      <div class="current-file ${content.audio ? "" : "hidden"}" data-role="obj-audio-current" data-lang="${lang}">
        ${content.audio ? `Current: ${esc(content.audio)} <button type="button" class="current-file__remove" data-content-id="${content.id}" data-field="audio" title="Remove">&times;</button>` : ""}
      </div>
      <label class="form-label">Subtitles (VTT)</label>
      <input type="file" class="form-input obj-content-subtitles" data-lang="${lang}" accept=".vtt,text/vtt,text/plain">
      <div class="current-file ${content.subtitles ? "" : "hidden"}" data-role="obj-subtitles-current" data-lang="${lang}">
        ${content.subtitles ? `Current: ${esc(content.subtitles)} <button type="button" class="current-file__remove" data-content-id="${content.id}" data-field="subtitles" title="Remove">&times;</button>` : ""}
      </div>
    `;
    container.appendChild(fieldset);
  }

  // Wire up remove buttons for content files
  container.querySelectorAll(".current-file__remove[data-content-id]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const contentId = btn.dataset.contentId;
      const field = btn.dataset.field;
      try {
        await api(`collections/object_content/records/${contentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: null }),
        });
        btn.closest(".current-file").classList.add("hidden");
        showToast("File removed");
      } catch (e) {
        showToast("Could not remove the file.");
      }
    });
  });
}

function showCurrentFile(elId, filename, collection, recordId, field) {
  const el = $(`#${elId}`);
  if (filename) {
    el.innerHTML = `Current: ${esc(filename)} <button class="current-file__remove" data-record="${recordId}" data-collection="${collection}" data-filename="${filename}" data-field="${field || ""}" title="Remove">&times;</button>`;
    el.classList.remove("hidden");
  } else {
    el.classList.add("hidden");
  }
}

async function saveObject(e) {
  e.preventDefault();
  if (!validateRequiredFields($("#objectForm"))) return;
  const id = $("#objectFormId").value;
  const formData = new FormData();
  formData.append("set", $("#objectFormSetId").value || selectedSetId);
  // Keep name_en for backward compatibility / sorting
  const firstNameEl = document.querySelector(".obj-content-name");
  formData.append("slug", $("#objectSlug").value.trim());
  formData.append("sort_order", parseInt($("#objectSortOrder").value) || 1);
  formData.append("default_language", $("#objectDefaultLang").value);
  formData.append("name_en", firstNameEl?.value.trim() || "");

  const mapX = $("#objectMapX").value;
  const mapY = $("#objectMapY").value;
  formData.append("map_x", mapX !== "" ? parseFloat(mapX) : -1);
  formData.append("map_y", mapY !== "" ? parseFloat(mapY) : -1);

  const floorBtns = $("#objectFloorButtons");
  const selectedFloorId = floorBtns.dataset.selectedFloor || "";
  formData.append("floor", selectedFloorId);
  formData.append("group", $("#objectGroup").value || "");

  // Outdoor coordinates
  const selFloor = objectPickerFloors.find(f => f.id === selectedFloorId);
  if (selFloor && selFloor.type === "outdoor") {
    formData.append("latitude", $("#objectLatitude").value || "");
    formData.append("longitude", $("#objectLongitude").value || "");
    formData.append("trigger_radius", $("#objectTriggerRadius").value || "15");
  }

  try {
    let savedId;
    if (id) {
      const result = await api(`collections/objects/records/${id}`, { method: "PATCH", body: formData });
      editingObject = result;
      savedId = id;
    } else {
      const result = await api("collections/objects/records", { method: "POST", body: formData });
      editingObject = result;
      savedId = result.id;
      $("#objectFormId").value = result.id;
      $("#btnDeleteObject").classList.remove("hidden");
      $("#btnPreviewObject").classList.remove("hidden");
      $("#btnQRCode").classList.remove("hidden");
    }
    // Separate JSON PATCH for boolean published field
    await api(`collections/objects/records/${savedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: $("#objectPublished").checked }),
    });

    // Save content for each language
    const setId = $("#objectFormSetId").value || selectedSetId;
    const parentSet = currentSets.find(s => s.id === setId);
    const setLangs = (parentSet && parentSet.available_languages) || ["en", "sv"];

    for (const lang of setLangs) {
      const nameEl = document.querySelector(`.obj-content-name[data-lang="${lang}"]`);
      const audioEl = document.querySelector(`.obj-content-audio[data-lang="${lang}"]`);
      const subtitlesEl = document.querySelector(`.obj-content-subtitles[data-lang="${lang}"]`);

      const existing = editingObjectContent[lang];
      const contentForm = new FormData();
      contentForm.append("object", savedId);
      contentForm.append("language", lang);
      contentForm.append("name", nameEl?.value.trim() || "");

      const audioFile = audioEl?.files[0];
      if (audioFile) contentForm.append("audio", audioFile);
      const subtitlesFile = subtitlesEl?.files[0];
      if (subtitlesFile) contentForm.append("subtitles", subtitlesFile);

      if (existing && existing.id) {
        const result = await api(`collections/object_content/records/${existing.id}`, {
          method: "PATCH",
          body: contentForm,
        });
        editingObjectContent[lang] = result;
      } else {
        const result = await api("collections/object_content/records", {
          method: "POST",
          body: contentForm,
        });
        editingObjectContent[lang] = result;
      }
    }

    showToast("Object saved!");
    formDirty = false;
  } catch (e) {
    showToast("Could not save the object. Please check that all required fields are filled in and the slug is unique.");
  }
}

function deleteObject() {
  if (!editingObject) return;
  confirmAction($("#btnDeleteObject"), async () => {
    try {
      const setId = editingObject.set;
      await api(`collections/objects/records/${editingObject.id}`, { method: "DELETE" });
      // Re-number remaining objects to close gaps
      await renumberObjects(setId);
      showToast("Object deleted");
      formDirty = false;
      backToObjects();
    } catch (e) {
      showToast("Could not delete this object. Please try again.");
    }
  });
}

async function renumberObjects(setId) {
  try {
    const resp = await api(`collections/objects/records?filter=(set='${encodeURIComponent(setId)}')&sort=sort_order&perPage=200`);
    const objects = resp.items || [];
    const updates = [];
    for (let i = 0; i < objects.length; i++) {
      const newOrder = i + 1;
      if (objects[i].sort_order !== newOrder) {
        updates.push(api(`collections/objects/records/${objects[i].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: newOrder }),
        }));
      }
    }
    if (updates.length > 0) await Promise.all(updates);
  } catch (e) {
    console.error("Renumber failed:", e);
  }
}

function backToObjects() {
  $("#panelObjectForm").classList.add("hidden");
  $("#panelObjects").classList.remove("hidden");
  loadObjects(selectedSetId);
}

function duplicateObject() {
  if (!editingObject) return;
  $("#objectFormTitle").textContent = "New Object (Duplicate)";
  $("#objectFormId").value = "";
  $("#objectFormSetId").value = editingObject.set;
  $("#objectSlug").value = editingObject.slug + "-copy";
  $("#objectSortOrder").value = currentObjects.length + 1;
  $("#objectDefaultLang").value = editingObject.default_language || "en";
  $("#objectMapX").value = editingObject.map_x ?? "";
  $("#objectMapY").value = editingObject.map_y ?? "";
  $("#objectLatitude").value = editingObject.latitude ?? "";
  $("#objectLongitude").value = editingObject.longitude ?? "";
  $("#objectTriggerRadius").value = editingObject.trigger_radius || 15;

  // Copy text content but clear file inputs (files can't be duplicated)
  const dupContent = {};
  for (const [lang, content] of Object.entries(editingObjectContent)) {
    dupContent[lang] = { name: content.name || "" };
  }
  editingObjectContent = dupContent;

  const setId = editingObject.set;
  const parentSet = currentSets.find(s => s.id === setId);
  const setLangs = (parentSet && parentSet.available_languages) || ["en", "sv"];
  renderObjectContentFieldsets(setLangs);

  editingObject = null;
  $("#btnDeleteObject").classList.add("hidden");
  $("#btnPreviewObject").classList.add("hidden");
  $("#btnQRCode").classList.add("hidden");
  $("#btnDuplicateObject").classList.add("hidden");
  $("#imagesGrid").innerHTML = "";

  formDirty = true;
}

// ===== MAP PICKER =====
function destroyAdminMap() {
  if (adminMapInstance) {
    adminMapInstance.remove();
    adminMapInstance = null;
    adminMapMarker = null;
    adminRadiusCircle = null;
  }
}

function showPickerForFloor(floor, obj) {
  const container = $("#mapPickerContainer");
  const outdoorContainer = $("#outdoorMapPickerContainer");
  const noMap = $("#mapPickerNoMap");
  const indoorRow = $("#indoorCoordsRow");
  const outdoorRow = $("#outdoorCoordsRow");

  destroyAdminMap();

  if (floor && floor.type === "outdoor") {
    // Outdoor mode
    container.classList.add("hidden");
    noMap.classList.add("hidden");
    outdoorContainer.classList.remove("hidden");
    indoorRow.classList.add("hidden");
    outdoorRow.classList.remove("hidden");

    // Populate outdoor fields
    $("#objectLatitude").value = obj ? (obj.latitude || "") : "";
    $("#objectLongitude").value = obj ? (obj.longitude || "") : "";
    $("#objectTriggerRadius").value = obj ? (obj.trigger_radius || 15) : 15;

    initOutdoorObjectPicker(floor, obj);
  } else if (floor && floor.map_image) {
    // Indoor mode
    outdoorContainer.classList.add("hidden");
    noMap.classList.add("hidden");
    container.classList.remove("hidden");
    indoorRow.classList.remove("hidden");
    outdoorRow.classList.add("hidden");

    const img = $("#mapPickerImage");
    img.src = fileUrl("floors", floor.id, floor.map_image);
    $("#mapPickerPinLabel").textContent = obj ? obj.sort_order : "";
  } else {
    // No map
    container.classList.add("hidden");
    outdoorContainer.classList.add("hidden");
    noMap.classList.remove("hidden");
    indoorRow.classList.remove("hidden");
    outdoorRow.classList.add("hidden");
  }
}

async function initOutdoorObjectPicker(floor, obj) {
  const L = await loadLeaflet();
  const pickerEl = $("#outdoorMapPicker");
  const lat = floor.center_lat || 59.329;
  const lng = floor.center_lng || 18.069;
  const zoom = floor.zoom_level || 16;

  adminMapInstance = L.map(pickerEl).setView([lat, lng], zoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
    maxZoom: 19,
  }).addTo(adminMapInstance);

  // Place marker if coordinates exist
  if (obj && obj.latitude && obj.longitude) {
    placeAdminMarker(obj.latitude, obj.longitude);
    adminMapInstance.setView([obj.latitude, obj.longitude], zoom);
  }

  // Click to place pin
  adminMapInstance.on("click", (e) => {
    const { lat, lng } = e.latlng;
    $("#objectLatitude").value = lat.toFixed(6);
    $("#objectLongitude").value = lng.toFixed(6);
    placeAdminMarker(lat, lng);
  });

  // Manual input changes update the marker
  $("#objectLatitude").oninput = updateAdminMarkerFromInputs;
  $("#objectLongitude").oninput = updateAdminMarkerFromInputs;
  $("#objectTriggerRadius").oninput = updateAdminRadius;
}

function placeAdminMarker(lat, lng) {
  if (!adminMapInstance) return;
  const L = window.L;
  if (adminMapMarker) {
    adminMapMarker.setLatLng([lat, lng]);
  } else {
    adminMapMarker = L.marker([lat, lng]).addTo(adminMapInstance);
  }
  // Trigger radius circle
  const radius = parseInt($("#objectTriggerRadius").value) || 15;
  if (adminRadiusCircle) {
    adminRadiusCircle.setLatLng([lat, lng]);
    adminRadiusCircle.setRadius(radius);
  } else {
    adminRadiusCircle = L.circle([lat, lng], {
      radius: radius,
      fillColor: "#0057b8",
      fillOpacity: 0.15,
      color: "#0057b8",
      weight: 2,
      dashArray: "6 4",
    }).addTo(adminMapInstance);
  }
}

function updateAdminMarkerFromInputs() {
  const lat = parseFloat($("#objectLatitude").value);
  const lng = parseFloat($("#objectLongitude").value);
  if (!isNaN(lat) && !isNaN(lng)) {
    placeAdminMarker(lat, lng);
  }
}

function updateAdminRadius() {
  if (!adminRadiusCircle) return;
  const radius = parseInt($("#objectTriggerRadius").value) || 15;
  adminRadiusCircle.setRadius(radius);
}

async function setupMapPicker(obj) {
  const set = currentSets.find((s) => s.id === (obj ? obj.set : selectedSetId));
  const container = $("#mapPickerContainer");
  const outdoorContainer = $("#outdoorMapPickerContainer");
  const noMap = $("#mapPickerNoMap");
  const picker = $("#mapPicker");
  const img = $("#mapPickerImage");
  const pin = $("#mapPickerPin");
  const pinLabel = $("#mapPickerPinLabel");

  destroyAdminMap();
  outdoorContainer.classList.add("hidden");
  $("#outdoorCoordsRow").classList.add("hidden");
  $("#indoorCoordsRow").classList.remove("hidden");

  // Load floors for this set
  let floors = [];
  if (set) {
    try {
      const floorsResp = await api(`collections/floors/records?filter=(set='${encodeURIComponent(set.id)}')&sort=sort_order&perPage=50`);
      floors = floorsResp.items || [];
    } catch (e) {
      floors = [];
    }
  }
  objectPickerFloors = floors;

  // Floor buttons
  if (floors.length > 0) {
    $("#floorSelectRow").classList.remove("hidden");
    const btnContainer = $("#objectFloorButtons");
    btnContainer.innerHTML = "";
    const selectedFloor = obj ? obj.floor : (floors.length > 0 ? floors[0].id : "");
    floors.forEach(floor => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn--small" + (floor.id === selectedFloor ? " btn--primary" : "");
      btn.textContent = floor.label;
      const floorFc = floor._content || {};
      const floorName = Object.values(floorFc).find(c => c.name)?.name || floor.label;
      btn.title = floorName;
      btn.addEventListener("click", () => {
        btnContainer.querySelectorAll(".btn").forEach(b => b.classList.remove("btn--primary"));
        btn.classList.add("btn--primary");
        btnContainer.dataset.selectedFloor = floor.id;
        showPickerForFloor(floor, obj);
      });
      btnContainer.appendChild(btn);
    });
    btnContainer.dataset.selectedFloor = selectedFloor;

    // Show map for selected floor or first floor with content
    const activeFloor = floors.find(f => f.id === selectedFloor) || floors.find(f => f.map_image || f.type === "outdoor") || null;
    if (activeFloor) {
      showPickerForFloor(activeFloor, obj);
    } else if (!set || !set.map_image) {
      container.classList.add("hidden");
      noMap.classList.remove("hidden");
    } else {
      noMap.classList.add("hidden");
      container.classList.remove("hidden");
      img.src = fileUrl("sets", set.id, set.map_image);
      pinLabel.textContent = obj ? obj.sort_order : "";
    }
  } else {
    $("#floorSelectRow").classList.add("hidden");
    $("#objectFloorButtons").dataset.selectedFloor = "";

    if (!set || !set.map_image) {
      container.classList.add("hidden");
      noMap.classList.remove("hidden");
      return;
    }

    noMap.classList.add("hidden");
    container.classList.remove("hidden");
    img.src = fileUrl("sets", set.id, set.map_image);
    pinLabel.textContent = obj ? obj.sort_order : "";
  }

  // Place pin if coordinates exist
  function updatePinPosition() {
    const x = parseFloat($("#objectMapX").value);
    const y = parseFloat($("#objectMapY").value);
    if (!isNaN(x) && !isNaN(y)) {
      pin.style.left = x + "%";
      pin.style.top = y + "%";
      pin.classList.remove("hidden");
    } else {
      pin.classList.add("hidden");
    }
  }

  updatePinPosition();

  // Click on map to place pin
  picker.onclick = (e) => {
    const rect = img.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
    const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
    $("#objectMapX").value = x;
    $("#objectMapY").value = y;
    updatePinPosition();
  };

  // Also update pin when inputs change manually
  $("#objectMapX").oninput = updatePinPosition;
  $("#objectMapY").oninput = updatePinPosition;
}

// ===== FLOORS =====
async function loadFloors(setId) {
  try {
    const resp = await api(`collections/floors/records?filter=(set='${encodeURIComponent(setId)}')&sort=sort_order&perPage=50`);
    currentFloors = resp.items || [];
    // Auto-create first floor if none exist
    if (currentFloors.length === 0) {
      const formData = new FormData();
      formData.append("set", setId);
      formData.append("label", "1");
      formData.append("sort_order", "1");
      try {
        await api("collections/floors/records", { method: "POST", body: formData });
        const resp2 = await api(`collections/floors/records?filter=(set='${encodeURIComponent(setId)}')&sort=sort_order&perPage=50`);
        currentFloors = resp2.items || [];
      } catch (e) { /* best effort */ }
    }
    // Load floor_content for per-language labels/names
    if (currentFloors.length > 0) {
      try {
        const floorIds = currentFloors.map(f => f.id);
        const fcResp = await api(`collections/floor_content/records?filter=(floor='${floorIds.join("'||floor='")}')&perPage=200`);
        for (const fc of (fcResp.items || [])) {
          const floor = currentFloors.find(f => f.id === fc.floor);
          if (floor) {
            floor._content = floor._content || {};
            floor._content[fc.language] = fc;
          }
        }
      } catch (e) { /* content table may not exist yet */ }
    }

    // Update hint text based on floor count
    const hasOutdoor = currentFloors.some(f => f.type === "outdoor");
    $("#floorsHint").textContent = currentFloors.length > 1
      ? (hasOutdoor ? "Manage floors and outdoor areas. Visitors can switch between them." : "Manage map images for each floor. Visitors can switch between floors.")
      : "Upload a map image for the exhibition.";
    renderFloorsList();
    updateDefaultFloorDropdown();
  } catch (e) {
    currentFloors = [];
  }
}

function renderFloorsList() {
  const container = $("#floorsList");
  container.innerHTML = "";
  const setLangs = editingSetLanguages || ["en"];
  for (let i = 0; i < currentFloors.length; i++) {
    const floor = currentFloors[i];
    const card = document.createElement("div");
    card.className = "floor-card";
    const isMulti = currentFloors.length > 1;
    const isOutdoor = floor.type === "outdoor";
    const floorContent = floor._content || {};

    let langFieldsHtml = "";
    if (isMulti) {
      for (const lang of setLangs) {
        const fc = floorContent[lang] || {};
        langFieldsHtml += `
          <div style="max-width:80px">
            <label class="form-label">Label (${lang})</label>
            <input type="text" class="form-input floor-label-lang" data-lang="${lang}" value="${esc(fc.label || floor.label || "")}" maxlength="10" placeholder="${isOutdoor ? "Out" : "G"}">
          </div>
          <div>
            <label class="form-label">Name (${esc(langName(lang))})</label>
            <input type="text" class="form-input floor-name-lang" data-lang="${lang}" value="${esc(fc.name || "")}" placeholder="${isOutdoor ? "Outdoor" : "Ground Floor"}">
          </div>
        `;
      }
    }

    card.innerHTML = `
      ${isMulti ? `<div class="form-row form-row--inline" style="flex-wrap:wrap">${langFieldsHtml}</div>` : ""}
      ${isOutdoor ? `
      <div class="form-row">
        <label class="form-label">Map center &amp; zoom</label>
        <div class="leaflet-preview" data-floor-id="${floor.id}" style="height:300px;border-radius:8px;border:2px solid var(--color-border)"></div>
        <div class="form-row form-row--inline" style="margin-top:var(--spacing-sm)">
          <div>
            <label class="form-label form-label--small">Latitude</label>
            <input type="number" class="form-input floor-center-lat" value="${floor.center_lat || ""}" step="0.000001" placeholder="59.329">
          </div>
          <div>
            <label class="form-label form-label--small">Longitude</label>
            <input type="number" class="form-input floor-center-lng" value="${floor.center_lng || ""}" step="0.000001" placeholder="18.069">
          </div>
          <div>
            <label class="form-label form-label--small">Zoom</label>
            <input type="number" class="form-input floor-zoom-level" value="${floor.zoom_level || 16}" min="1" max="20" step="1">
          </div>
        </div>
      </div>
      ` : `
      <div class="form-row">
        <label class="form-label">Map image</label>
        <input type="file" class="form-input floor-map-file" accept="image/png,image/jpeg,image/webp">
        <div class="current-file ${floor.map_image ? "" : "hidden"}" data-floor-file>
          Current: ${esc(floor.map_image || "")}
        </div>
      </div>
      `}
      <div style="display:flex;gap:var(--spacing-sm);margin-top:var(--spacing-xs);align-items:center">
        ${isMulti ? `<button type="button" class="btn btn--small floor-move-up" data-index="${i}" ${i === 0 ? "disabled" : ""} title="Move up">&#9650;</button>
        <button type="button" class="btn btn--small floor-move-down" data-index="${i}" ${i === currentFloors.length - 1 ? "disabled" : ""} title="Move down">&#9660;</button>` : ""}
        <button type="button" class="btn btn--primary btn--small floor-save" data-id="${floor.id}">Save</button>
        ${isMulti ? `<button type="button" class="btn btn--danger btn--small floor-delete" data-id="${floor.id}">Delete</button>` : ""}
      </div>
    `;
    container.appendChild(card);
  }

  // Initialize Leaflet maps for outdoor floor cards
  initOutdoorFloorPreviews();

  // Wire save buttons
  container.querySelectorAll(".floor-save").forEach(btn => {
    btn.addEventListener("click", async () => {
      const card = btn.closest(".floor-card");
      const floorId = btn.dataset.id;
      const floor = currentFloors.find(f => f.id === floorId);
      const isOutdoor = floor && floor.type === "outdoor";
      const formData = new FormData();
      // Use first language's label as the floor's base label
      const firstLabelInput = card.querySelector(".floor-label-lang");
      formData.append("label", firstLabelInput ? firstLabelInput.value.trim() : floor.label);
      if (isOutdoor) {
        formData.append("center_lat", card.querySelector(".floor-center-lat").value || "");
        formData.append("center_lng", card.querySelector(".floor-center-lng").value || "");
        formData.append("zoom_level", card.querySelector(".floor-zoom-level").value || "16");
      } else {
        const file = card.querySelector(".floor-map-file")?.files[0];
        if (file) formData.append("map_image", file);
      }
      try {
        await api(`collections/floors/records/${floorId}`, { method: "PATCH", body: formData });
        // Save per-language labels and names to floor_content
        const labelInputs = card.querySelectorAll(".floor-label-lang");
        const nameInputs = card.querySelectorAll(".floor-name-lang");
        const floorContent = floor._content || {};
        for (const input of labelInputs) {
          const lang = input.dataset.lang;
          const label = input.value.trim();
          const nameInput = card.querySelector(`.floor-name-lang[data-lang="${lang}"]`);
          const name = nameInput ? nameInput.value.trim() : "";
          const existing = floorContent[lang];
          if (existing && existing.id) {
            await api(`collections/floor_content/records/${existing.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ label, name }),
            });
          } else if (label || name) {
            await api("collections/floor_content/records", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ floor: floorId, language: lang, label, name }),
            });
          }
        }
        showToast("Floor saved!");
        loadFloors(editingSet.id);
      } catch (e) {
        showToast("Could not save floor: " + e.message);
      }
    });
  });

  // Wire delete buttons
  container.querySelectorAll(".floor-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      confirmAction(btn, async () => {
        try {
          await api(`collections/floors/records/${btn.dataset.id}`, { method: "DELETE" });
          showToast("Floor deleted");
          loadFloors(editingSet.id);
        } catch (e) {
          showToast("Could not delete floor.");
        }
      });
    });
  });

  // Wire move up/down buttons
  container.querySelectorAll(".floor-move-up, .floor-move-down").forEach(btn => {
    btn.addEventListener("click", async () => {
      const idx = parseInt(btn.dataset.index);
      const isUp = btn.classList.contains("floor-move-up");
      const swapIdx = isUp ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= currentFloors.length) return;
      const a = currentFloors[idx];
      const b = currentFloors[swapIdx];
      try {
        await Promise.all([
          api(`collections/floors/records/${a.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: b.sort_order }),
          }),
          api(`collections/floors/records/${b.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: a.sort_order }),
          }),
        ]);
        loadFloors(editingSet.id);
      } catch (e) {
        showToast("Could not reorder floors.");
      }
    });
  });
}

async function addFloor() {
  if (!editingSet) return;
  const formData = new FormData();
  formData.append("set", editingSet.id);
  formData.append("label", String(currentFloors.length + 1));
  formData.append("sort_order", String(currentFloors.length + 1));
  formData.append("type", "indoor");
  try {
    await api("collections/floors/records", { method: "POST", body: formData });
    showToast("Floor added — fill in the details below");
    loadFloors(editingSet.id);
  } catch (e) {
    showToast("Could not add floor: " + e.message);
  }
}

async function addOutdoor() {
  if (!editingSet) return;
  const formData = new FormData();
  formData.append("set", editingSet.id);
  formData.append("label", "Out");
  formData.append("sort_order", String(currentFloors.length + 1));
  formData.append("type", "outdoor");
  formData.append("center_lat", "59.329");
  formData.append("center_lng", "18.069");
  formData.append("zoom_level", "16");
  try {
    await api("collections/floors/records", { method: "POST", body: formData });
    showToast("Outdoor area added");
    loadFloors(editingSet.id);
  } catch (e) {
    showToast("Could not add outdoor area: " + e.message);
  }
}

async function initOutdoorFloorPreviews() {
  const previews = document.querySelectorAll(".leaflet-preview[data-floor-id]");
  if (previews.length === 0) return;
  const L = await loadLeaflet();
  for (const container of previews) {
    const floorId = container.dataset.floorId;
    const floor = currentFloors.find(f => f.id === floorId);
    if (!floor) continue;
    const lat = floor.center_lat || 59.329;
    const lng = floor.center_lng || 18.069;
    const zoom = floor.zoom_level || 16;
    const map = L.map(container).setView([lat, lng], zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    map.on("moveend", () => {
      const card = container.closest(".floor-card");
      const c = map.getCenter();
      card.querySelector(".floor-center-lat").value = c.lat.toFixed(6);
      card.querySelector(".floor-center-lng").value = c.lng.toFixed(6);
      card.querySelector(".floor-zoom-level").value = map.getZoom();
    });
    // Sync inputs → map
    const card = container.closest(".floor-card");
    const latInput = card.querySelector(".floor-center-lat");
    const lngInput = card.querySelector(".floor-center-lng");
    const zoomInput = card.querySelector(".floor-zoom-level");
    function syncFromInputs() {
      const la = parseFloat(latInput.value);
      const ln = parseFloat(lngInput.value);
      const z = parseInt(zoomInput.value);
      if (!isNaN(la) && !isNaN(ln)) map.setView([la, ln], isNaN(z) ? map.getZoom() : z);
    }
    latInput.addEventListener("change", syncFromInputs);
    lngInput.addEventListener("change", syncFromInputs);
    zoomInput.addEventListener("change", syncFromInputs);
  }
}

function updateDefaultFloorDropdown() {
  const select = $("#setDefaultFloor");
  select.innerHTML = "";
  for (const floor of currentFloors) {
    const opt = document.createElement("option");
    opt.value = floor.id;
    const fc = floor._content || {};
    const firstName = Object.values(fc).find(c => c.name)?.name || "";
    opt.textContent = floor.label + (firstName ? ` — ${firstName}` : "");
    select.appendChild(opt);
  }
  select.value = editingSet.default_floor || (currentFloors.length > 0 ? currentFloors[0].id : "");
  $("#defaultFloorRow").style.display = currentFloors.length > 0 ? "" : "none";
}

// ===== GROUPS =====
let currentGroups = [];

async function loadGroups(setId) {
  try {
    const resp = await api(`collections/groups/records?filter=(set='${encodeURIComponent(setId)}')&sort=sort_order&perPage=50`);
    currentGroups = resp.items || [];
    if (currentGroups.length > 0) {
      const groupIds = currentGroups.map(g => g.id);
      const gcResp = await api(`collections/group_content/records?filter=(group='${groupIds.join("'||group='")}')&perPage=200`);
      for (const gc of (gcResp.items || [])) {
        const group = currentGroups.find(g => g.id === gc.group);
        if (group) {
          group._content = group._content || {};
          group._content[gc.language] = gc;
        }
      }
    }
    $("#groupsFieldset").style.display = "";
    renderGroupsList();
  } catch (e) {
    currentGroups = [];
  }
}

function renderGroupsList() {
  const container = $("#groupsList");
  container.innerHTML = "";
  const setLangs = editingSetLanguages || ["en"];

  for (let i = 0; i < currentGroups.length; i++) {
    const group = currentGroups[i];
    const gc = group._content || {};
    const card = document.createElement("div");
    card.className = "floor-card";

    let titleFieldsHtml = "";
    for (const lang of setLangs) {
      const title = gc[lang]?.title || "";
      titleFieldsHtml += `
        <div>
          <label class="form-label">Title (${esc(langName(lang))})</label>
          <input type="text" class="form-input group-title-lang" data-lang="${lang}" value="${esc(title)}" placeholder="e.g. Room A">
        </div>
      `;
    }

    card.innerHTML = `
      <div class="form-row form-row--inline" style="flex-wrap:wrap">
        <div style="max-width:100px">
          <label class="form-label">Order</label>
          <input type="number" class="form-input group-sort-order" value="${group.sort_order}" min="0">
        </div>
        ${titleFieldsHtml}
        <div style="max-width:120px">
          <label class="form-label">Color</label>
          <div class="color-input-wrap">
            <input type="color" class="group-color-picker" value="${group.color || "#0057b8"}" tabindex="-1">
            <input type="text" class="form-input color-hex-input group-color-text" value="${esc(group.color || "")}" maxlength="7" placeholder="Optional">
          </div>
        </div>
      </div>
      <div style="display:flex;gap:var(--spacing-sm);margin-top:var(--spacing-xs);align-items:center">
        <button type="button" class="btn btn--primary btn--small group-save" data-id="${group.id}">Save</button>
        <button type="button" class="btn btn--danger btn--small group-delete" data-id="${group.id}">Delete</button>
      </div>
    `;
    container.appendChild(card);

    // Sync color picker and text input
    const picker = card.querySelector(".group-color-picker");
    const textInput = card.querySelector(".group-color-text");
    picker.addEventListener("input", () => { textInput.value = picker.value; });
    textInput.addEventListener("input", () => {
      if (/^#[0-9a-fA-F]{6}$/.test(textInput.value)) picker.value = textInput.value;
    });
  }

  // Save handlers
  container.querySelectorAll(".group-save").forEach(btn => {
    btn.addEventListener("click", async () => {
      const card = btn.closest(".floor-card");
      const groupId = btn.dataset.id;
      const sortOrder = parseInt(card.querySelector(".group-sort-order").value) || 0;
      const colorText = card.querySelector(".group-color-text").value.trim();
      const color = /^#[0-9a-fA-F]{6}$/.test(colorText) ? colorText : "";
      try {
        await api(`collections/groups/records/${groupId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: sortOrder, color }),
        });
        // Save titles per language
        const group = currentGroups.find(g => g.id === groupId);
        const gc = group?._content || {};
        const titleInputs = card.querySelectorAll(".group-title-lang");
        for (const input of titleInputs) {
          const lang = input.dataset.lang;
          const title = input.value.trim();
          const existing = gc[lang];
          if (existing && existing.id) {
            await api(`collections/group_content/records/${existing.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title }),
            });
          } else if (title) {
            await api("collections/group_content/records", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ group: groupId, language: lang, title }),
            });
          }
        }
        showToast("Group saved!");
        loadGroups(editingSet.id);
      } catch (e) {
        showToast("Could not save group: " + e.message);
      }
    });
  });

  // Delete handlers
  container.querySelectorAll(".group-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      confirmAction(btn, async () => {
        try {
          await api(`collections/groups/records/${btn.dataset.id}`, { method: "DELETE" });
          showToast("Group deleted");
          loadGroups(editingSet.id);
        } catch (e) {
          showToast("Could not delete group: " + e.message);
        }
      });
    });
  });
}

async function addGroup() {
  if (!editingSet) return;
  try {
    await api("collections/groups/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        set: editingSet.id,
        sort_order: currentGroups.length + 1,
      }),
    });
    showToast("Group added");
    loadGroups(editingSet.id);
  } catch (e) {
    showToast("Could not add group: " + e.message);
  }
}

function getGroupDisplayTitle(group) {
  const gc = group._content || {};
  for (const lang of Object.keys(gc)) {
    if (gc[lang]?.title) return gc[lang].title;
  }
  return "(Untitled group)";
}

// ===== IMAGES =====
async function loadObjectImages(objectId) {
  try {
    const resp = await api(`collections/object_images/records?filter=(object='${encodeURIComponent(objectId)}')&sort=sort_order&perPage=100`);
    const images = resp.items || [];
    // Load captions from image_content table
    if (images.length > 0) {
      const imgIds = images.map(img => img.id);
      const captionResp = await api(`collections/image_content/records?filter=(image='${imgIds.join("'||image='")}')&perPage=500`);
      const allCaptions = captionResp.items || [];
      for (const img of images) {
        img._captions = {};
        for (const c of allCaptions) {
          if (c.image === img.id) img._captions[c.language] = c;
        }
      }
    }
    renderImagesGrid(images);
  } catch (e) {
    showToast("Could not load images. Please try refreshing the page.");
  }
}

function getFirstCaption(captions) {
  for (const lang of Object.keys(captions)) {
    if (captions[lang]?.caption) return captions[lang].caption;
  }
  return "";
}

function renderImagesGrid(images) {
  const grid = $("#imagesGrid");
  grid.innerHTML = "";
  const setId = $("#objectFormSetId").value || selectedSetId;
  const parentSet = currentSets.find(s => s.id === setId);
  const setLangs = (parentSet && parentSet.available_languages) || ["en", "sv"];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const url = fileUrl("object_images", img.id, img.image);
    const captions = img._captions || {};
    const displayCaption = getFirstCaption(captions) || "No caption";
    const card = document.createElement("div");
    card.className = "image-card";
    card.dataset.imageId = img.id;

    let captionFieldsHtml = "";
    for (const lang of setLangs) {
      const cap = captions[lang]?.caption || "";
      captionFieldsHtml += `
        <label class="form-label" style="font-size:0.8rem;${lang !== setLangs[0] ? "margin-top:0.25rem;" : ""}">Caption (${esc(langName(lang))})</label>
        <input type="text" class="form-input image-caption" data-lang="${lang}" value="${esc(cap)}" placeholder="${esc(langName(lang))} caption">
      `;
    }

    card.innerHTML = `
      <div class="image-card__order">
        <button class="btn image-card__move" data-move="-1" data-index="${i}" title="Move up" ${i === 0 ? "disabled" : ""}>▲</button>
        <span class="image-card__order-num">${i + 1}</span>
        <button class="btn image-card__move" data-move="1" data-index="${i}" title="Move down" ${i === images.length - 1 ? "disabled" : ""}>▼</button>
      </div>
      <div style="position:relative">
        <img src="${url}" alt="${esc(displayCaption)}" loading="lazy">
        ${img.media_type === "360" ? '<span class="image-card__360-badge">360°</span>' : ""}
        ${img.media_type === "3d" ? '<span class="image-card__360-badge">3D</span>' : ""}
      </div>
      <div class="image-card__caption image-card__caption--display">${esc(displayCaption)}</div>
      <div class="image-card__edit-fields" style="display:none">
        ${captionFieldsHtml}
        <label class="form-label" style="font-size:0.8rem;margin-top:0.25rem">Media type</label>
        <select class="form-input form-select image-media-type" style="font-size:0.8rem">
          <option value="image" ${(img.media_type || "image") === "image" ? "selected" : ""}>Image</option>
          <option value="360" ${img.media_type === "360" ? "selected" : ""}>360° photo</option>
          <option value="3d" ${img.media_type === "3d" ? "selected" : ""}>3D model</option>
        </select>
      </div>
      <div class="image-card__actions">
        <button class="btn btn--edit" data-edit-image="${img.id}" title="Edit captions">Edit</button>
        <button class="btn btn--save" data-save-image="${img.id}" title="Save captions" style="display:none">Save</button>
        <button class="btn btn--danger" data-delete-image="${img.id}" title="Delete">Delete</button>
      </div>
    `;
    grid.appendChild(card);
  }

  // Move handlers — swap sort_order of the two affected records
  grid.querySelectorAll("[data-move]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = parseInt(btn.dataset.index);
      const dir = parseInt(btn.dataset.move);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= images.length) return;

      const a = images[idx];
      const b = images[swapIdx];
      try {
        await Promise.all([
          api(`collections/object_images/records/${a.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: b.sort_order }),
          }),
          api(`collections/object_images/records/${b.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sort_order: a.sort_order }),
          }),
        ]);
        loadObjectImages(editingObject.id);
      } catch (e) {
        showToast("Could not reorder images. Please try again.");
      }
    });
  });

  // Edit caption handlers
  grid.querySelectorAll("[data-edit-image]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".image-card");
      card.querySelector(".image-card__caption--display").style.display = "none";
      card.querySelector(".image-card__edit-fields").style.display = "block";
      btn.style.display = "none";
      card.querySelector("[data-save-image]").style.display = "";
    });
  });

  // Save caption handlers
  grid.querySelectorAll("[data-save-image]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const card = btn.closest(".image-card");
      const imageId = btn.dataset.saveImage;
      const mediaType = card.querySelector(".image-media-type")?.value || "image";
      try {
        await api(`collections/object_images/records/${imageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ media_type: mediaType }),
        });
        // Save captions per language to image_content
        const captionInputs = card.querySelectorAll(".image-caption");
        const img = images.find(im => im.id === imageId);
        const captions = img?._captions || {};
        for (const input of captionInputs) {
          const lang = input.dataset.lang;
          const caption = input.value.trim();
          const existing = captions[lang];
          if (existing && existing.id) {
            await api(`collections/image_content/records/${existing.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ caption }),
            });
          } else if (caption) {
            await api("collections/image_content/records", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: imageId, language: lang, caption }),
            });
          }
        }
        showToast("Saved!");
        loadObjectImages(editingObject.id);
      } catch (e) {
        showToast("Could not save. Please try again.");
      }
    });
  });

  // Delete image handlers
  grid.querySelectorAll("[data-delete-image]").forEach((btn) => {
    btn.addEventListener("click", () => {
      confirmAction(btn, async () => {
        try {
          await api(`collections/object_images/records/${btn.dataset.deleteImage}`, { method: "DELETE" });
          loadObjectImages(editingObject.id);
          showToast("Image deleted");
        } catch (e) {
          showToast("Could not delete this image. Please try again.");
        }
      });
    });
  });
}

async function uploadImage(e) {
  e.preventDefault();
  if (!editingObject || !$("#objectFormId").value) {
    showToast("Please save the object first — images can only be added to saved objects.");
    return;
  }

  const objectId = $("#objectFormId").value;
  const mediaType = $("#imageMediaType").value;
  const imageFile = $("#imageFile").files[0];
  const modelFile = mediaType === "3d" ? $("#imageModelFile").files[0] : null;

  if (!imageFile && mediaType !== "3d") {
    showToast("Please select an image file.");
    return;
  }
  if (mediaType === "3d" && !modelFile) {
    showToast("Please select a 3D model file (.glb).");
    return;
  }

  const formData = new FormData();
  formData.append("object", objectId);
  if (imageFile) formData.append("image", imageFile);

  // Determine sort order (next available)
  const currentImages = $("#imagesGrid").children.length;
  formData.append("sort_order", currentImages + 1);

  try {
    const result = await api("collections/object_images/records", { method: "POST", body: formData });
    if (mediaType === "3d" && modelFile) {
      const modelForm = new FormData();
      modelForm.append("model_file", modelFile);
      modelForm.append("media_type", "3d");
      await api(`collections/object_images/records/${result.id}`, { method: "PATCH", body: modelForm });
    } else if (mediaType !== "image") {
      await api(`collections/object_images/records/${result.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });
    }

    // Save captions to image_content
    const captionInputs = document.querySelectorAll("#imageCaptionFields .image-upload-caption");
    for (const input of captionInputs) {
      const lang = input.dataset.lang;
      const caption = input.value.trim();
      if (caption) {
        await api("collections/image_content/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: result.id, language: lang, caption }),
        });
      }
    }

    showToast("Image uploaded!");
    $("#imageFile").value = "";
    document.querySelectorAll("#imageCaptionFields .image-upload-caption").forEach(el => el.value = "");
    $("#imageMediaType").value = "image";
    $("#imageModelFile").value = "";
    $("#modelFileRow").classList.add("hidden");
    loadObjectImages(objectId);
  } catch (e) {
    showToast("Could not upload the image. Please check the file size and format and try again.");
  }
}

// ===== QR CODE =====
function generateQRCode() {
  if (!editingObject) return;

  // Find the set slug
  const set = currentSets.find((s) => s.id === editingObject.set);
  if (!set) {
    showToast("Could not find the set for this object. Please try saving first.");
    return;
  }

  const url = `${window.location.origin}/#/${set.slug}/${editingObject.slug}`;

  // Simple QR code generation using canvas
  // We'll use a minimal QR encoder
  const canvas = $("#qrCanvas");
  generateQRToCanvas(canvas, url);

  $("#qrModal").classList.remove("hidden");
}

function downloadQR() {
  const canvas = $("#qrCanvas");
  const link = document.createElement("a");
  link.download = `qr-${editingObject.slug}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// Minimal QR code generation using canvas
// Uses the vendored qrcode-generator library loaded via script tag in index.html
function generateQRToCanvas(canvas, text) {
  drawQR(canvas, text);
}

function drawQR(canvas, text) {
  if (typeof qrcode === "undefined") return;
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();

  const ctx = canvas.getContext("2d");
  const modules = qr.getModuleCount();
  const cellSize = Math.floor(280 / modules);
  const offset = Math.floor((300 - modules * cellSize) / 2);

  canvas.width = 300;
  canvas.height = 300;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 300, 300);

  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      ctx.fillStyle = qr.isDark(row, col) ? "#000000" : "#ffffff";
      ctx.fillRect(offset + col * cellSize, offset + row * cellSize, cellSize, cellSize);
    }
  }
}

// ===== Preview =====
function previewObject() {
  if (!editingObject) return;
  const set = currentSets.find((s) => s.id === editingObject.set);
  if (!set) return;
  window.open(`/#/${set.slug}/${editingObject.slug}`, "_blank");
}

// ===== Toast =====
let adminToastTimeout = null;
function showToast(msg) {
  if (adminToastTimeout) clearTimeout(adminToastTimeout);
  const toast = $("#adminToast");
  toast.textContent = msg;
  toast.classList.add("visible");
  adminToastTimeout = setTimeout(() => toast.classList.remove("visible"), 3000);
}

// ===== Utility =====
function esc(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function validateRequiredFields(form) {
  const requiredInputs = form.querySelectorAll("[required]");
  let valid = true;
  let firstInvalid = null;
  requiredInputs.forEach((input) => {
    input.classList.remove("invalid");
    if (!input.value.trim()) {
      input.classList.add("invalid");
      valid = false;
      if (!firstInvalid) firstInvalid = input;
    }
  });
  if (!valid && firstInvalid) {
    // Expand collapsed fieldset if the invalid field is inside one
    const fieldset = firstInvalid.closest(".form-fieldset.collapsed");
    if (fieldset) fieldset.classList.remove("collapsed");
    firstInvalid.focus();
    firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("Please fill in all required fields.");
  }
  return valid;
}

function confirmAction(btn, action, label = "Delete") {
  if (btn.dataset.confirming === "true") {
    action();
    return;
  }
  const originalText = btn.textContent;
  btn.textContent = "Confirm " + label + "?";
  btn.dataset.confirming = "true";
  btn.classList.add("btn--danger-confirm");
  const timeout = setTimeout(() => {
    resetConfirmButton(btn);
  }, 5000);
  btn.addEventListener("click", () => clearTimeout(timeout), { once: true });
}

function resetConfirmButton(btn) {
  if (btn.dataset.confirming === "true") {
    btn.dataset.confirming = "false";
    btn.classList.remove("btn--danger-confirm");
    if (btn.id === "btnDeleteSet") btn.textContent = "Delete Set";
    else if (btn.id === "btnDeleteObject") btn.textContent = "Delete Object";
    else btn.textContent = "Delete";
  }
}

// ===== Event Handlers =====
function setupEvents() {
  // Login
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await login($("#loginEmail").value, $("#loginPassword").value);
      showApp();
    } catch (err) {
      $("#loginError").textContent = err.message;
      $("#loginError").classList.remove("hidden");
    }
  });

  // Logout
  $("#btnLogout").addEventListener("click", logout);

  // Dirty state tracking
  function markDirty() { formDirty = true; }
  function clearInvalid(e) { e.target.classList.remove("invalid"); }
  $("#setForm").addEventListener("input", markDirty);
  $("#setForm").addEventListener("input", clearInvalid);
  $("#setForm").addEventListener("change", markDirty);
  $("#objectForm").addEventListener("input", markDirty);
  $("#objectForm").addEventListener("input", clearInvalid);
  $("#objectForm").addEventListener("change", markDirty);

  window.addEventListener("beforeunload", (e) => {
    if (formDirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  function checkDirtyAndProceed(action) {
    if (formDirty) {
      if (!confirm("You have unsaved changes. Discard them?")) return;
      formDirty = false;
    }
    action();
  }

  // Tabs
  $$(".admin-nav__tab").forEach((tab) => {
    tab.addEventListener("click", () => checkDirtyAndProceed(() => showTab(tab.dataset.tab)));
  });

  // Colour pickers — two-way sync between swatch and hex text input
  function isValidHex(val) {
    return /^#[0-9a-fA-F]{6}$/.test(val);
  }

  $("#setColorPrimary").addEventListener("input", (e) => {
    $("#setColorPrimaryText").value = e.target.value;
  });
  $("#setColorPrimaryText").addEventListener("input", (e) => {
    const val = e.target.value.startsWith("#") ? e.target.value : "#" + e.target.value;
    if (isValidHex(val)) $("#setColorPrimary").value = val;
  });

  $("#setColorAccent").addEventListener("input", (e) => {
    $("#setColorAccentText").value = e.target.value;
  });
  $("#setColorAccentText").addEventListener("input", (e) => {
    const val = e.target.value.startsWith("#") ? e.target.value : "#" + e.target.value;
    if (isValidHex(val)) $("#setColorAccent").value = val;
  });

  // Sets
  $("#btnNewSet").addEventListener("click", () => editSet(null));
  $("#btnBackToSets").addEventListener("click", () => {
    checkDirtyAndProceed(() => {
      $("#panelSetForm").classList.add("hidden");
      $("#panelSets").classList.remove("hidden");
    });
  });

  $("#btnGoToObjects").addEventListener("click", () => {
    if (!editingSet) return;
    checkDirtyAndProceed(() => {
      selectedSetId = editingSet.id;
      showTab("objects");
    });
  });
  $("#setForm").addEventListener("submit", saveSet);
  $("#btnDeleteSet").addEventListener("click", deleteSet);
  $("#btnAddLanguage").addEventListener("click", addSetLanguage);

  // Floors
  $("#btnAddFloor").addEventListener("click", addFloor);
  $("#btnAddOutdoor").addEventListener("click", addOutdoor);
  $("#btnAddGroup").addEventListener("click", addGroup);

  // Objects
  $("#objectSetFilter").addEventListener("change", (e) => loadObjects(e.target.value));
  $("#btnNewObject").addEventListener("click", () => editObject(null));
  $("#btnBackToObjects").addEventListener("click", () => checkDirtyAndProceed(backToObjects));
  $("#objectForm").addEventListener("submit", saveObject);
  $("#btnDeleteObject").addEventListener("click", deleteObject);

  // Images
  $("#imageUploadForm").addEventListener("submit", uploadImage);
  $("#imageMediaType").addEventListener("change", () => {
    const is3d = $("#imageMediaType").value === "3d";
    $("#modelFileRow").classList.toggle("hidden", !is3d);
    $("#imageFile").required = !is3d;
    $("#imageFileLabel").textContent = is3d ? "Poster image (optional)" : "Image file";
  });

  // QR
  $("#btnQRCode").addEventListener("click", generateQRCode);
  $("#btnCloseQR").addEventListener("click", () => $("#qrModal").classList.add("hidden"));
  $("#btnDownloadQR").addEventListener("click", downloadQR);

  // Duplicate
  $("#btnDuplicateObject").addEventListener("click", () => checkDirtyAndProceed(duplicateObject));

  // Preview
  $("#btnPreviewObject").addEventListener("click", previewObject);

  // File remove buttons (event delegation)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".current-file__remove");
    if (!btn) return;

    confirmAction(btn, async () => {
      const field = btn.dataset.field;
      const record = btn.dataset.record;
      const collection = btn.dataset.collection;

      try {
        if (field === "logo" && editingSet) {
          // Set logo removal
          const formData = new FormData();
          formData.append("logo", "");
          await api(`collections/sets/records/${editingSet.id}`, { method: "PATCH", body: formData });
          editingSet.logo = "";
        } else if (field === "map_image" && editingSet) {
          // Set map image removal
          const formData = new FormData();
          formData.append("map_image", "");
          await api(`collections/sets/records/${editingSet.id}`, { method: "PATCH", body: formData });
          editingSet.map_image = "";
        } else if (field === "custom_font" && editingSet) {
          // Set custom font removal
          const formData = new FormData();
          formData.append("custom_font", "");
          await api(`collections/sets/records/${editingSet.id}`, { method: "PATCH", body: formData });
          editingSet.custom_font = "";
        } else if (record && collection && field) {
          // Object file removal
          const formData = new FormData();
          formData.append(field, "");
          await api(`collections/${collection}/records/${record}`, { method: "PATCH", body: formData });
          if (editingObject && editingObject.id === record) {
            editingObject[field] = "";
          }
        }
        // Hide the current-file display
        const wrapper = btn.closest(".current-file");
        if (wrapper) wrapper.classList.add("hidden");
      } catch (err) {
        showToast("Could not remove the file. Please try again.");
      }
    }, "Remove");
  });
}

// ===== JWT Expiration Check =====
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp < Date.now() / 1000;
  } catch (e) {
    return true;
  }
}

// ===== Init =====
function init() {
  setupEvents();

  // Check if already authenticated
  if (authToken) {
    // If the token is expired, log out immediately
    if (isTokenExpired(authToken)) {
      logout();
      return;
    }
    // Verify token by making a request
    api("collections/sets/records?perPage=1")
      .then(() => showApp())
      .catch(() => showLogin());
  } else {
    showLogin();
  }
}

init();
