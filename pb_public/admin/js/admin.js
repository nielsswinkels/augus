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
let setSlugManual = false;
let objectSlugManual = false;
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
  se: "Davvisámegiella", fit: "Meänkieli",
  yi: "ייִדיש", rom: "Romani",
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
    // QW2: Load object counts per set
    try {
      const objResp = await api("collections/objects/records?perPage=1&fields=id,set,published");
      // Fetch all objects to count per set (using a larger perPage)
      const allObjResp = await api("collections/objects/records?perPage=500&fields=id,set,published");
      const allObjs = allObjResp.items || [];
      for (const s of currentSets) {
        const setObjs = allObjs.filter(o => o.set === s.id);
        s._objectCount = setObjs.length;
        s._publishedCount = setObjs.filter(o => o.published).length;
      }
    } catch (e) {
      // Non-critical, just skip counts
      for (const s of currentSets) { s._objectCount = -1; }
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
    const countText = set._objectCount >= 0
      ? `${set._objectCount} object${set._objectCount !== 1 ? "s" : ""}${set._objectCount > 0 ? ` (${set._publishedCount} published)` : ""}`
      : "";
    card.innerHTML = `
      <div class="set-card__info">
        <div class="set-card__name">${esc(getSetDisplayName(set))}${set.published ? "" : ' <span class="set-card__draft">Draft</span>'}</div>
        <div class="set-card__slug">/${esc(set.slug)}</div>
        ${countText ? `<div class="set-card__count">${esc(countText)}</div>` : ""}
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
  setSlugManual = !!set;
  resetConfirmButton($("#btnDeleteSet"));
  resetConfirmButton($("#btnDeleteSetHeader"));
  $("#setFormTitle").textContent = set ? "Edit Set" : "New Set";
  $("#panelSets").classList.add("hidden");
  $("#panelSetForm").classList.remove("hidden");

  if (set) {
    $("#setFormId").value = set.id;
    $("#setSlug").value = set.slug;
    $("#btnDeleteSet").classList.remove("hidden");
    $("#btnDeleteSetHeader").style.display = "";
    $("#btnGoToObjects").style.display = "";
    $("#btnExportSet").style.display = "";

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
    $("#setPublishedHeader").checked = !!set.published;
    $("#setSequentialNav").checked = !!set.sequential_navigation;
    $("#setShowNumbers").checked = set.show_numbers !== false;
    $("#setTreasureHunt").checked = !!set.treasure_hunt;
    $("#setShowBranding").checked = set.show_augus_branding !== false;
    if (typeof updateTreasureHuntState === "function") updateTreasureHuntState();

    $("#floorsFieldset").style.display = "";
    loadFloors(set.id);

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
    $("#setPublishedHeader").checked = false;
    $("#setSequentialNav").checked = true;
    $("#setShowNumbers").checked = true;
    $("#setTreasureHunt").checked = false;
    if (typeof updateTreasureHuntState === "function") updateTreasureHuntState();
    $("#setShowBranding").checked = true;
    $("#btnDeleteSet").classList.add("hidden");
    $("#btnDeleteSetHeader").style.display = "none";
    $("#btnGoToObjects").style.display = "none";
    $("#btnExportSet").style.display = "none";
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

  // Auto-generate slug from first language name (only for new sets)
  const firstNameInput = container.querySelector(".set-content-name");
  if (firstNameInput && !$("#setFormId").value) {
    firstNameInput.addEventListener("input", () => {
      if (!setSlugManual) {
        $("#setSlug").value = toSlug(firstNameInput.value);
      }
    });
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
  // Use first available language name for name_en fallback (used for sorting)
  let firstLangName = "";
  for (const lang of editingSetLanguages) {
    const el = document.querySelector(`.set-content-name[data-lang="${lang}"]`);
    if (el && el.value.trim()) { firstLangName = el.value.trim(); break; }
  }
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
        published: $("#setPublishedHeader").checked,
        sequential_navigation: $("#setSequentialNav").checked,
        show_numbers: $("#setShowNumbers").checked,
        treasure_hunt: $("#setTreasureHunt").checked,
        show_augus_branding: $("#setShowBranding").checked,
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
    // Reload the set to get fresh data (e.g. new ID for new sets)
    const freshResp = await api(`collections/sets/records/${savedSetId}`);
    editSet(freshResp);
  } catch (e) {
    showToast(e.message || "Could not save the set. Please check that all required fields are filled in and try again.");
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
    // Load groups for this set
    try {
      const groupResp = await api(`collections/groups/records?filter=(set='${encodeURIComponent(setId)}')&sort=sort_order&perPage=50`);
      currentGroups = groupResp.items || [];
      if (currentGroups.length > 0) {
        const groupIds = currentGroups.map(g => g.id);
        const gcResp = await api(`collections/group_content/records?filter=(group='${groupIds.join("'||group='")}')&perPage=200`);
        for (const gc of (gcResp.items || [])) {
          const group = currentGroups.find(g => g.id === gc.group);
          if (group) { group._content = group._content || {}; group._content[gc.language] = gc; }
        }
      }
    } catch (e) { currentGroups = []; }

    // Load set languages for group editing
    const parentSet = currentSets.find(s => s.id === setId);
    editingSetLanguages = (parentSet && parentSet.available_languages) || ["en"];

    // Clean up fractional sort_orders from drag-and-drop
    await renumberFlatList();

    renderObjectsList();
    $("#btnAddGroup").classList.remove("hidden");
    $("#btnNewObject").classList.remove("hidden");
  } catch (e) {
    showToast("Could not load objects. Please check your connection and try again.");
  }
}

function buildFlatList() {
  const ungrouped = currentObjects.filter(o => !o.group);
  const entries = [];
  for (const obj of ungrouped) entries.push({ type: "object", obj, sortOrder: obj.sort_order });
  for (const group of currentGroups) entries.push({ type: "group", group, sortOrder: group.sort_order });
  entries.sort((a, b) => a.sortOrder - b.sortOrder);
  const flat = [];
  for (const entry of entries) {
    flat.push(entry);
    if (entry.type === "group") {
      const groupObjs = currentObjects.filter(o => o.group === entry.group.id);
      groupObjs.sort((a, b) => a.sort_order - b.sort_order);
      for (const obj of groupObjs) flat.push({ type: "grouped-object", obj, group: entry.group });
    }
  }
  return flat;
}

function renderObjectCard(obj, isGrouped, groupColor) {
  const card = document.createElement("div");
  card.className = "object-card" + (isGrouped ? " object-card--grouped" : "");
  if (isGrouped && groupColor) card.style.borderLeftColor = groupColor;
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.innerHTML = `
    <input type="checkbox" class="object-card__checkbox" data-object-id="${esc(obj.id)}" title="Select for batch actions" onclick="event.stopPropagation()">
    <div class="object-card__move">
      <button class="btn btn--small item-move-up" title="Move up" aria-label="Move up">&#9650;</button>
      <button class="btn btn--small item-move-down" title="Move down" aria-label="Move down">&#9660;</button>
    </div>
    <div class="object-card__info">
      <div class="object-card__name">${esc(obj._displayName || obj.name_en || "(Untitled)")}${obj.published ? "" : ' <span class="set-card__draft">Draft</span>'}</div>
      <div class="object-card__slug">/${esc(obj.slug)}</div>
    </div>
  `;
  card.addEventListener("click", (e) => { if (!e.target.closest("button") && !e.target.closest("input[type=checkbox]")) editObject(obj); });
  card.addEventListener("keydown", (e) => { if (e.key === "Enter") editObject(obj); });
  // B1: Wire checkbox to update batch bar
  card.querySelector(".object-card__checkbox").addEventListener("change", updateBatchBar);
  return card;
}

function renderGroupHeader(group) {
  const gc = group._content || {};
  const title = getGroupDisplayTitle(group);
  const parentSet = currentSets.find(s => s.id === selectedSetId);
  const setPrimary = parentSet?.color_primary || "#0057b8";
  const color = group.color || "";
  const displayColor = color || setPrimary;
  const card = document.createElement("div");
  card.className = "object-card object-card--group-header";
  card.style.borderLeftColor = displayColor;
  card.innerHTML = `
    <div class="object-card__move">
      <button class="btn btn--small item-move-up" title="Move up" aria-label="Move up">&#9650;</button>
      <button class="btn btn--small item-move-down" title="Move down" aria-label="Move down">&#9660;</button>
    </div>
    <div class="object-card__info" style="flex:1">
      <div class="object-card__name">${esc(title)}</div>
    </div>
    <button class="btn btn--small group-edit-btn" title="Edit group">Edit</button>
    <button class="btn btn--danger btn--small group-delete-btn" title="Delete group">Delete</button>
  `;
  card.querySelector(".group-edit-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    openGroupEditModal(group, gc, displayColor, color);
  });
  card.querySelector(".group-delete-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    confirmAction(card.querySelector(".group-delete-btn"), async () => {
      try {
        const grouped = currentObjects.filter(o => o.group === group.id);
        for (const obj of grouped) await api(`collections/objects/records/${obj.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group: "" }) });
        await api(`collections/groups/records/${group.id}`, { method: "DELETE" });
        showToast("Group deleted — objects ungrouped");
        loadObjects(selectedSetId);
      } catch (err) { showToast("Could not delete group: " + err.message); }
    });
  });
  return card;
}

async function moveItem(flat, flatIndex, direction) {
  const entry = flat[flatIndex];

  if (entry.type === "group") {
    // For groups: skip past own children to find the real swap target
    let targetIdx = flatIndex + direction;
    if (direction === 1) {
      // Skip all own children
      while (targetIdx < flat.length && flat[targetIdx].type === "grouped-object" && flat[targetIdx].group.id === entry.group.id) {
        targetIdx++;
      }
    }
    if (targetIdx < 0 || targetIdx >= flat.length) return;
    const target = flat[targetIdx];
    // Skip over target's children too if it's a group
    if (target.type === "group") {
      await swapSort("groups", entry.group, target.group);
    } else if (target.type === "object") {
      await swapSortCross("groups", entry.group, "objects", target.obj);
    } else if (target.type === "grouped-object") {
      // Swap with the target's parent group
      const parentGroup = currentGroups.find(g => g.id === target.group.id);
      if (parentGroup) await swapSort("groups", entry.group, parentGroup);
    }
    loadObjects(selectedSetId);
    return;
  }

  // Object movement (same as before)
  const obj = entry.obj;
  const targetIdx = flatIndex + direction;
  if (targetIdx < 0 || targetIdx >= flat.length) return;
  const target = flat[targetIdx];

  if (direction === -1) {
    if (entry.type === "grouped-object") {
      const groupIdx = flat.findIndex(e => e.type === "group" && e.group.id === entry.group.id);
      if (flatIndex === groupIdx + 1) {
        await api(`collections/objects/records/${obj.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group: "", sort_order: entry.group.sort_order - 0.5 }) });
      } else {
        await swapSort("objects", obj, flat[targetIdx].obj);
      }
    } else {
      if (target.type === "grouped-object") {
        await api(`collections/objects/records/${obj.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group: target.group.id, sort_order: target.obj.sort_order + 0.5 }) });
      } else if (target.type === "group") {
        const groupObjs = currentObjects.filter(o => o.group === target.group.id);
        const maxOrder = groupObjs.length > 0 ? Math.max(...groupObjs.map(o => o.sort_order)) : 0;
        await api(`collections/objects/records/${obj.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group: target.group.id, sort_order: maxOrder + 1 }) });
      } else {
        await swapSort("objects", obj, target.obj);
      }
    }
  } else {
    if (entry.type === "grouped-object") {
      const groupObjs = flat.filter(e => e.type === "grouped-object" && e.group.id === entry.group.id);
      if (groupObjs[groupObjs.length - 1].obj.id === obj.id) {
        await api(`collections/objects/records/${obj.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group: "", sort_order: entry.group.sort_order + 0.5 }) });
      } else {
        await swapSort("objects", flat[targetIdx].obj, obj);
      }
    } else {
      if (target.type === "group") {
        const groupObjs = currentObjects.filter(o => o.group === target.group.id);
        const minOrder = groupObjs.length > 0 ? Math.min(...groupObjs.map(o => o.sort_order)) : target.group.sort_order;
        await api(`collections/objects/records/${obj.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group: target.group.id, sort_order: minOrder - 0.5 }) });
      } else if (target.type === "object") {
        await swapSort("objects", obj, target.obj);
      }
    }
  }
  loadObjects(selectedSetId);
}

async function renumberFlatList() {
  const flat = buildFlatList();
  const updates = [];
  let order = 1;
  for (const entry of flat) {
    if (entry.type === "group") {
      if (entry.group.sort_order !== order) {
        entry.group.sort_order = order;
        updates.push(api(`collections/groups/records/${entry.group.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: order }),
        }));
      }
      order++;
    } else if (entry.type === "object") {
      if (entry.obj.sort_order !== order) {
        entry.obj.sort_order = order;
        updates.push(api(`collections/objects/records/${entry.obj.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: order }),
        }));
      }
      order++;
    }
  }
  // Renumber within groups
  for (const group of currentGroups) {
    const groupObjs = currentObjects.filter(o => o.group === group.id);
    groupObjs.sort((a, b) => a.sort_order - b.sort_order);
    let gOrder = 1;
    for (const obj of groupObjs) {
      if (obj.sort_order !== gOrder) {
        obj.sort_order = gOrder;
        updates.push(api(`collections/objects/records/${obj.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: gOrder }),
        }));
      }
      gOrder++;
    }
  }
  if (updates.length > 0) await Promise.all(updates);
}

async function swapSort(col, a, b) {
  await Promise.all([
    api(`collections/${col}/records/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: b.sort_order }) }),
    api(`collections/${col}/records/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: a.sort_order }) }),
  ]);
}

async function swapSortCross(colA, a, colB, b) {
  await Promise.all([
    api(`collections/${colA}/records/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: b.sort_order }) }),
    api(`collections/${colB}/records/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: a.sort_order }) }),
  ]);
}

function renderObjectsList() {
  const container = $("#objectsList");
  container.innerHTML = "";
  // Hide batch bar when re-rendering
  $("#batchBar").classList.add("hidden");
  if (currentObjects.length === 0 && currentGroups.length === 0) {
    // QW4: Getting started checklist for new/empty sets
    if (selectedSetId) {
      const parentSet = currentSets.find(s => s.id === selectedSetId);
      const hasLangs = parentSet && parentSet.available_languages && parentSet.available_languages.length > 0;
      const hasName = parentSet && getSetDisplayName(parentSet) !== "(Untitled)";
      const hasFloors = currentFloors && currentFloors.some(f => f.map_image || f.type === "outdoor");
      container.innerHTML = `
        <div class="getting-started">
          <h3>Getting started</h3>
          <ol>
            <li class="done">1. Create set (done)</li>
            <li class="${hasLangs && hasName ? "done" : "pending"}">2. Add languages and set a name ${hasLangs && hasName ? "(done)" : ""}</li>
            <li class="${hasFloors ? "done" : "pending"}">3. Upload a map image ${hasFloors ? "(done)" : ""}</li>
            <li class="pending">4. Add objects</li>
          </ol>
        </div>
      `;
    } else {
      container.innerHTML = '<p style="color:var(--color-text-secondary)">No objects yet.</p>';
    }
    return;
  }
  const flat = buildFlatList();
  let dragSrcIdx = null;

  function clearDropIndicators() {
    container.querySelectorAll(".drop-line-active").forEach(el => el.classList.remove("drop-line-active"));
    container.querySelectorAll(".drop-into-active").forEach(el => el.classList.remove("drop-into-active"));
    container.querySelectorAll(".dragging").forEach(el => el.classList.remove("dragging"));
  }

  function createDropLine(dropIndex, groupId) {
    const line = document.createElement("div");
    line.className = "drop-line";
    line.dataset.dropIndex = dropIndex;
    if (groupId) line.dataset.dropGroup = groupId;
    line.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      clearDropIndicators();
      line.classList.add("drop-line-active");
    });
    line.addEventListener("dragleave", () => line.classList.remove("drop-line-active"));
    line.addEventListener("drop", (e) => handleDrop(e, line));
    return line;
  }

  async function handleDrop(e, dropEl) {
    e.preventDefault();
    clearDropIndicators();
    if (dragSrcIdx === null) return;
    const src = flat[dragSrcIdx];
    const dropIndex = parseInt(dropEl.dataset.dropIndex);
    const dropGroup = dropEl.dataset.dropGroup || "";

    // Calculate target sort_order based on neighbors (use global sort_order)
    function globalOrder(entry) {
      if (!entry) return null;
      if (entry.type === "group") return entry.group.sort_order;
      if (entry.type === "grouped-object") return entry.group.sort_order;
      return entry.obj.sort_order;
    }
    const prev = dropIndex > 0 ? flat[dropIndex - 1] : null;
    const next = dropIndex < flat.length ? flat[dropIndex] : null;
    const prevOrder = globalOrder(prev) ?? 0;
    const nextOrder = globalOrder(next) ?? prevOrder + 2;
    const targetOrder = (prevOrder + nextOrder) / 2;

    try {
      if (src.type === "group") {
        await api(`collections/groups/records/${src.group.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: targetOrder }),
        });
      } else {
        await api(`collections/objects/records/${src.obj.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ group: dropGroup, sort_order: targetOrder }),
        });
      }
      loadObjects(selectedSetId);
    } catch (err) { showToast("Could not reorder."); }
  }

  // Drop line at the very top
  container.appendChild(createDropLine(0, ""));

  for (let i = 0; i < flat.length; i++) {
    const entry = flat[i];
    let card;
    if (entry.type === "group") card = renderGroupHeader(entry.group);
    else {
      const parentSet = currentSets.find(s => s.id === selectedSetId);
      const setPrimary = parentSet?.color_primary || "#0057b8";
      const objGroupColor = entry.group ? (entry.group.color || setPrimary) : "";
      card = renderObjectCard(entry.obj, entry.type === "grouped-object", objGroupColor);
    }
    card.dataset.flatIndex = i;
    card.draggable = true;
    card.querySelector(".item-move-up")?.addEventListener("click", (e) => { e.stopPropagation(); moveItem(flat, i, -1); });
    card.querySelector(".item-move-down")?.addEventListener("click", (e) => { e.stopPropagation(); moveItem(flat, i, 1); });

    card.addEventListener("dragstart", (e) => {
      dragSrcIdx = i;
      e.dataTransfer.effectAllowed = "move";
      card.classList.add("dragging");
      container.classList.add("dragging-active");
    });
    card.addEventListener("dragend", () => {
      clearDropIndicators();
      container.classList.remove("dragging-active");
    });

    // Group headers: allow dropping INTO the group
    if (entry.type === "group") {
      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        clearDropIndicators();
        card.classList.add("drop-into-active");
      });
      card.addEventListener("dragleave", () => card.classList.remove("drop-into-active"));
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        clearDropIndicators();
        if (dragSrcIdx === null) return;
        const src = flat[dragSrcIdx];
        if (src.type === "group") return;
        const groupObjs = currentObjects.filter(o => o.group === entry.group.id);
        const minOrder = groupObjs.length > 0 ? Math.min(...groupObjs.map(o => o.sort_order)) : entry.group.sort_order;
        api(`collections/objects/records/${src.obj.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ group: entry.group.id, sort_order: minOrder - 0.5 }),
        }).then(() => loadObjects(selectedSetId)).catch(() => showToast("Could not reorder."));
      });
    }

    container.appendChild(card);

    // Drop line after each item
    const nextEntry = flat[i + 1];
    let lineGroupId = "";
    if (entry.type === "grouped-object" && nextEntry && nextEntry.type === "grouped-object" && nextEntry.group.id === entry.group.id) {
      // Between two objects in the same group
      lineGroupId = entry.group.id;
    }
    // All other cases: ungrouped drop line (between groups, after last child, etc.)
    container.appendChild(createDropLine(i + 1, lineGroupId));
  }
}

async function editObject(obj) {
  editingObject = obj;
  formDirty = false;
  objectSlugManual = !!obj;
  resetConfirmButton($("#btnDeleteObject"));
  resetConfirmButton($("#btnDeleteObjectHeader"));
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
    $("#objectPublishedHeader").checked = obj.published !== false;
    $("#btnDeleteObject").classList.remove("hidden");
    $("#btnDeleteObjectHeader").style.display = "";
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
    $("#objectPublishedHeader").checked = true;
    editingObjectContent = {};
    $("#btnDeleteObjectHeader").style.display = "none";
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

  // Auto-generate slug from first language name (only for new objects)
  const firstObjNameInput = container.querySelector(".obj-content-name");
  if (firstObjNameInput && !$("#objectFormId").value) {
    firstObjNameInput.addEventListener("input", () => {
      if (!objectSlugManual) {
        $("#objectSlug").value = toSlug(firstObjNameInput.value);
      }
    });
  }
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
      body: JSON.stringify({ published: $("#objectPublishedHeader").checked }),
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
    const defaultFloorId = set?.default_floor_rel || set?.default_floor || (floors.length > 0 ? floors[0].id : "");
    const selectedFloor = obj ? obj.floor : defaultFloorId;
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

// ===== R3: Group Edit Modal =====
function openGroupEditModal(group, gc, displayColor, color) {
  const setLangs = editingSetLanguages || ["en"];
  const body = $("#groupEditModalBody");
  let editHtml = "";
  for (const lang of setLangs) {
    const t = gc[lang]?.title || "";
    editHtml += `<div class="form-row"><label class="form-label">Title (${esc(langName(lang))})</label><input type="text" class="form-input group-modal-title" data-lang="${lang}" value="${esc(t)}"></div>`;
  }
  editHtml += `<div class="form-row"><label class="form-label">Color</label><div style="display:flex;align-items:center;gap:var(--spacing-sm)">
    <input type="color" id="groupModalColorPicker" value="${displayColor}" style="width:36px;height:36px;padding:2px;border:2px solid var(--color-border);border-radius:6px;cursor:pointer">
    <input type="text" class="form-input color-hex-input" id="groupModalColorText" value="${esc(color)}" maxlength="7" placeholder="Optional (e.g. #ff5500)">
  </div></div>`;
  editHtml += `<p class="form-hint" style="margin-top:var(--spacing-sm)">Drag objects onto a group header to add them, or use the Group dropdown in the object form.</p>`;
  body.innerHTML = editHtml;

  const picker = $("#groupModalColorPicker");
  const textInput = $("#groupModalColorText");
  picker.addEventListener("input", () => { textInput.value = picker.value; });
  textInput.addEventListener("input", () => { if (/^#[0-9a-fA-F]{6}$/.test(textInput.value)) picker.value = textInput.value; });

  // Wire save button
  const saveBtn = $("#btnSaveGroupEdit");
  const newSaveBtn = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
  newSaveBtn.addEventListener("click", async () => {
    const colorVal = textInput.value.trim();
    const finalColor = /^#[0-9a-fA-F]{6}$/.test(colorVal) ? colorVal : "";
    try {
      await api(`collections/groups/records/${group.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ color: finalColor }) });
      const titleInputs = body.querySelectorAll(".group-modal-title");
      for (const input of titleInputs) {
        const lang = input.dataset.lang;
        const titleVal = input.value.trim();
        const ex = gc[lang];
        if (ex && ex.id) { await api(`collections/group_content/records/${ex.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: titleVal }) }); }
        else if (titleVal) { await api("collections/group_content/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ group: group.id, language: lang, title: titleVal }) }); }
      }
      showToast("Group saved!");
      $("#groupEditModal").classList.add("hidden");
      loadObjects(selectedSetId);
    } catch (err) { showToast("Could not save group: " + err.message); }
  });

  $("#groupEditModal").classList.remove("hidden");
}

// ===== GROUPS =====
let currentGroups = [];

async function addGroup() {
  if (!selectedSetId) return;
  const maxOrder = Math.max(0, ...currentObjects.map(o => o.sort_order), ...currentGroups.map(g => g.sort_order));
  try {
    await api("collections/groups/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ set: selectedSetId, sort_order: maxOrder + 1 }),
    });
    showToast("Group added — click Edit to set title and color");
    loadObjects(selectedSetId);
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
      // Load video subtitles
      const videoItems = images.filter(img => img.media_type === "video");
      if (videoItems.length > 0) {
        try {
          const vIds = videoItems.map(v => v.id);
          const subsResp = await api(`collections/video_subtitles/records?filter=(media='${vIds.join("'||media='")}')&perPage=200`);
          for (const sub of (subsResp.items || [])) {
            const img = images.find(i => i.id === sub.media);
            if (img) {
              img._videoSubs = img._videoSubs || {};
              img._videoSubs[sub.language] = sub;
            }
          }
        } catch (e) { /* video_subtitles may not exist yet */ }
      }
    }
    renderImagesGrid(images);
  } catch (e) {
    showToast("Could not load images. Please try refreshing the page.");
  }
}

function buildVideoSubsHtml(img) {
  const subs = img._videoSubs || {};
  const setId = $("#objectFormSetId").value || selectedSetId;
  const parentSet = currentSets.find(s => s.id === setId);
  const setLangs = (parentSet && parentSet.available_languages) || ["en"];
  let html = '<div class="video-subs-section" style="margin-top:0.5rem">';
  html += '<label class="form-label" style="font-size:0.8rem">Video subtitles</label>';
  for (const lang of setLangs) {
    const sub = subs[lang];
    html += `<div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.25rem">
      <span style="font-size:0.75rem;min-width:30px">${lang.toUpperCase()}</span>
      ${sub ? `<span style="font-size:0.75rem">${esc(sub.subtitles)}</span>
        <button type="button" class="btn btn--danger btn--small video-sub-delete" data-sub-id="${sub.id}" style="min-height:24px;min-width:24px;padding:0 4px;font-size:0.7rem">&times;</button>` :
        `<input type="file" class="form-input video-sub-upload" data-lang="${lang}" data-media-id="${img.id}" accept=".vtt,text/vtt,text/plain" style="font-size:0.75rem">`}
    </div>`;
  }
  html += '</div>';
  return html;
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
        ${img.media_type === "video" ? '<span class="image-card__360-badge">Video</span>' : ""}
      </div>
      <div class="image-card__caption image-card__caption--display">${esc(displayCaption)}</div>
      <div class="image-card__edit-fields" style="display:none">
        ${captionFieldsHtml}
        <label class="form-label" style="font-size:0.8rem;margin-top:0.25rem">Media type</label>
        <select class="form-input form-select image-media-type" style="font-size:0.8rem">
          <option value="image" ${(img.media_type || "image") === "image" ? "selected" : ""}>Image</option>
          <option value="360" ${img.media_type === "360" ? "selected" : ""}>360° photo</option>
          <option value="3d" ${img.media_type === "3d" ? "selected" : ""}>3D model</option>
          <option value="video" ${img.media_type === "video" ? "selected" : ""}>Video</option>
        </select>
        ${img.media_type === "video" ? buildVideoSubsHtml(img) : ""}
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

  // Edit caption handlers (QW3: widen card on edit)
  grid.querySelectorAll("[data-edit-image]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".image-card");
      card.querySelector(".image-card__caption--display").style.display = "none";
      card.querySelector(".image-card__edit-fields").style.display = "block";
      btn.style.display = "none";
      card.querySelector("[data-save-image]").style.display = "";
      card.classList.add("image-card--editing");
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

  // Video subtitle upload handlers
  grid.querySelectorAll(".video-sub-upload").forEach(input => {
    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) return;
      const mediaId = input.dataset.mediaId;
      const lang = input.dataset.lang;
      const formData = new FormData();
      formData.append("media", mediaId);
      formData.append("language", lang);
      formData.append("subtitles", file);
      try {
        await api("collections/video_subtitles/records", { method: "POST", body: formData });
        showToast("Subtitle uploaded");
        loadObjectImages(editingObject.id);
      } catch (e) {
        showToast("Could not upload subtitle: " + e.message);
      }
    });
  });

  // Video subtitle delete handlers
  grid.querySelectorAll(".video-sub-delete").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await api(`collections/video_subtitles/records/${btn.dataset.subId}`, { method: "DELETE" });
        showToast("Subtitle removed");
        loadObjectImages(editingObject.id);
      } catch (e) {
        showToast("Could not remove subtitle.");
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
  const videoFile = mediaType === "video" ? $("#imageVideoFile").files[0] : null;

  if (!imageFile && mediaType !== "3d" && mediaType !== "video") {
    showToast("Please select an image file.");
    return;
  }
  if (mediaType === "3d" && !modelFile) {
    showToast("Please select a 3D model file (.glb).");
    return;
  }
  if (mediaType === "video" && !videoFile) {
    showToast("Please select a video file (.mp4 or .webm).");
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
    } else if (mediaType === "video" && videoFile) {
      const videoForm = new FormData();
      videoForm.append("video_file", videoFile);
      videoForm.append("media_type", "video");
      await api(`collections/object_images/records/${result.id}`, { method: "PATCH", body: videoForm });
    } else if (mediaType !== "image") {
      await api(`collections/object_images/records/${result.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media_type: mediaType }),
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
    $("#imageVideoFile").value = "";
    $("#modelFileRow").classList.add("hidden");
    $("#videoFileRow").classList.add("hidden");
    $("#videoSubsRow").classList.add("hidden");
    loadObjectImages(objectId);
  } catch (e) {
    showToast("Could not upload the image. Please check the file size and format and try again.");
  }
}

// ===== B2: Drag-and-Drop Image Upload =====
function setupDropZone() {
  const imagesSection = document.querySelector("#panelObjectForm .admin-section");
  if (!imagesSection) return;

  // Create drop zone element
  const dropZone = document.createElement("div");
  dropZone.className = "drop-zone";
  dropZone.id = "imageDropZone";
  dropZone.innerHTML = `
    <div class="drop-zone__text">Drop images here or click to browse</div>
    <div class="drop-zone__hint">Accepts PNG, JPEG, WebP, GIF</div>
    <div class="drop-zone__progress" id="dropZoneProgress" style="display:none"></div>
  `;

  // Create hidden file input for click-to-browse
  const hiddenInput = document.createElement("input");
  hiddenInput.type = "file";
  hiddenInput.accept = "image/png,image/jpeg,image/webp,image/gif";
  hiddenInput.multiple = true;
  hiddenInput.style.display = "none";
  hiddenInput.id = "dropZoneFileInput";
  dropZone.appendChild(hiddenInput);

  // Insert drop zone before the existing upload form
  const uploadForm = $("#imageUploadForm");
  uploadForm.parentNode.insertBefore(dropZone, uploadForm);

  // Click to browse
  dropZone.addEventListener("click", (e) => {
    if (e.target === hiddenInput) return;
    hiddenInput.click();
  });

  hiddenInput.addEventListener("change", () => {
    if (hiddenInput.files.length > 0) {
      handleDroppedFiles(Array.from(hiddenInput.files));
      hiddenInput.value = "";
    }
  });

  // Drag events
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drop-zone--active");
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drop-zone--active");
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drop-zone--active");
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (files.length > 0) handleDroppedFiles(files);
  });
}

async function handleDroppedFiles(files) {
  if (!editingObject || !$("#objectFormId").value) {
    showToast("Please save the object first -- images can only be added to saved objects.");
    return;
  }
  const objectId = $("#objectFormId").value;
  const progress = $("#dropZoneProgress");
  progress.style.display = "flex";
  progress.innerHTML = "";

  const currentImages = $("#imagesGrid").children.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const itemEl = document.createElement("div");
    itemEl.className = "drop-zone__progress-item";
    itemEl.innerHTML = `
      <span>${esc(file.name)}</span>
      <div class="drop-zone__progress-bar"><div class="drop-zone__progress-fill" style="width:0%"></div></div>
    `;
    progress.appendChild(itemEl);
    const fill = itemEl.querySelector(".drop-zone__progress-fill");

    try {
      fill.style.width = "30%";
      const formData = new FormData();
      formData.append("object", objectId);
      formData.append("image", file);
      formData.append("sort_order", currentImages + i + 1);
      fill.style.width = "60%";
      await api("collections/object_images/records", { method: "POST", body: formData });
      fill.style.width = "100%";
    } catch (e) {
      fill.style.background = "var(--color-danger)";
      fill.style.width = "100%";
    }
  }

  showToast(`${files.length} image(s) uploaded!`);
  setTimeout(() => { progress.style.display = "none"; progress.innerHTML = ""; }, 1500);
  loadObjectImages(objectId);
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
function toSlug(str) {
  return str.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 60);
}

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
  if (!btn) return;
  if (btn.dataset.confirming === "true") {
    btn.dataset.confirming = "false";
    btn.classList.remove("btn--danger-confirm");
    if (btn.id === "btnDeleteSet" || btn.id === "btnDeleteSetHeader") btn.textContent = "Delete Set";
    else if (btn.id === "btnDeleteObject" || btn.id === "btnDeleteObjectHeader") btn.textContent = "Delete Object";
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

  // QW1: Sync header published toggle with hidden field (set form)
  $("#setPublishedHeader").addEventListener("change", (e) => {
    $("#setPublished").checked = e.target.checked;
    markDirty();
  });

  // QW1: Delete set from header button
  $("#btnDeleteSetHeader").addEventListener("click", () => {
    if (!editingSet) return;
    confirmAction($("#btnDeleteSetHeader"), async () => {
      try {
        await api(`collections/sets/records/${editingSet.id}`, { method: "DELETE" });
        showToast("Set deleted");
        formDirty = false;
        showTab("sets");
      } catch (e) {
        showToast("Could not delete this set. It may still have objects -- delete those first.");
      }
    });
  });

  // QW1: Sync header published toggle with hidden field (object form)
  $("#objectPublishedHeader").addEventListener("change", (e) => {
    $("#objectPublished").checked = e.target.checked;
    markDirty();
  });

  // QW1: Delete object from header button
  $("#btnDeleteObjectHeader").addEventListener("click", () => {
    if (!editingObject) return;
    confirmAction($("#btnDeleteObjectHeader"), async () => {
      try {
        const setId = editingObject.set;
        await api(`collections/objects/records/${editingObject.id}`, { method: "DELETE" });
        await renumberObjects(setId);
        showToast("Object deleted");
        formDirty = false;
        backToObjects();
      } catch (e) {
        showToast("Could not delete this object. Please try again.");
      }
    });
  });

  // QW5: Keyboard shortcut Ctrl+S / Cmd+S
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      // Determine which form is visible and submit it
      if (!$("#panelSetForm").classList.contains("hidden")) {
        $("#setForm").requestSubmit();
      } else if (!$("#panelObjectForm").classList.contains("hidden")) {
        $("#objectForm").requestSubmit();
      }
    }
  });

  // B1: Batch operations
  $("#btnBatchPublish").addEventListener("click", async () => {
    const checked = getCheckedObjectIds();
    if (checked.length === 0) return;
    try {
      await Promise.all(checked.map(id => api(`collections/objects/records/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: true }),
      })));
      showToast(`${checked.length} object(s) published`);
      loadObjects(selectedSetId);
    } catch (e) { showToast("Could not publish selected objects."); }
  });

  $("#btnBatchUnpublish").addEventListener("click", async () => {
    const checked = getCheckedObjectIds();
    if (checked.length === 0) return;
    try {
      await Promise.all(checked.map(id => api(`collections/objects/records/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: false }),
      })));
      showToast(`${checked.length} object(s) unpublished`);
      loadObjects(selectedSetId);
    } catch (e) { showToast("Could not unpublish selected objects."); }
  });

  $("#btnBatchDelete").addEventListener("click", () => {
    const checked = getCheckedObjectIds();
    if (checked.length === 0) return;
    confirmAction($("#btnBatchDelete"), async () => {
      try {
        await Promise.all(checked.map(id => api(`collections/objects/records/${id}`, { method: "DELETE" })));
        showToast(`${checked.length} object(s) deleted`);
        loadObjects(selectedSetId);
      } catch (e) { showToast("Could not delete selected objects."); }
    });
  });

  // R3: Group edit modal
  $("#btnCloseGroupEdit").addEventListener("click", () => {
    $("#groupEditModal").classList.add("hidden");
  });
  $("#btnCancelGroupEdit").addEventListener("click", () => {
    $("#groupEditModal").classList.add("hidden");
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
  $("#setSlug").addEventListener("input", () => { setSlugManual = true; });
  $("#objectSlug").addEventListener("input", () => { objectSlugManual = true; });
  $("#setForm").addEventListener("submit", saveSet);
  $("#btnDeleteSet").addEventListener("click", deleteSet);
  $("#btnAddLanguage").addEventListener("click", addSetLanguage);

  // Treasure hunt overrides sequential nav
  window.updateTreasureHuntState = function() {
    const isTH = $("#setTreasureHunt").checked;
    $("#setSequentialNav").disabled = isTH;
    $("#sequentialNavRow").style.opacity = isTH ? "0.5" : "";
    $("#sequentialNavOverride").style.display = isTH ? "" : "none";
  }
  $("#setTreasureHunt").addEventListener("change", updateTreasureHuntState);

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
    const val = $("#imageMediaType").value;
    $("#modelFileRow").classList.toggle("hidden", val !== "3d");
    $("#videoFileRow").classList.toggle("hidden", val !== "video");
    $("#videoSubsRow").classList.toggle("hidden", val !== "video");
    $("#imageFile").required = val === "image" || val === "360";
    $("#imageFileLabel").textContent = (val === "3d" || val === "video") ? "Poster image (optional)" : "Image file";
  });

  // B2: Drag-and-drop image upload
  setupDropZone();

  // QR
  $("#btnQRCode").addEventListener("click", generateQRCode);
  $("#btnCloseQR").addEventListener("click", () => $("#qrModal").classList.add("hidden"));
  $("#btnDownloadQR").addEventListener("click", downloadQR);

  // Duplicate
  $("#btnDuplicateObject").addEventListener("click", () => checkDirtyAndProceed(duplicateObject));

  // Preview
  $("#btnPreviewObject").addEventListener("click", previewObject);

  // Export / Import
  $("#btnExportSet").addEventListener("click", exportSet);
  $("#btnImportSet").addEventListener("click", () => $("#importSetFile").click());
  $("#importSetFile").addEventListener("change", importSet);

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

// ===== EXPORT / IMPORT =====
async function exportSet() {
  if (!editingSet) return;
  showToast("Preparing export...");
  try {
    const set = editingSet;
    const setId = set.id;

    // Fetch all related data
    const [contentResp, floorsResp, groupsResp, objectsResp] = await Promise.all([
      api(`collections/set_content/records?filter=(set='${setId}')&perPage=50`),
      api(`collections/floors/records?filter=(set='${setId}')&sort=sort_order&perPage=50`),
      api(`collections/groups/records?filter=(set='${setId}')&sort=sort_order&perPage=50`),
      api(`collections/objects/records?filter=(set='${setId}')&sort=sort_order&perPage=200`),
    ]);

    const setContent = contentResp.items || [];
    const floors = floorsResp.items || [];
    const groups = groupsResp.items || [];
    const objects = objectsResp.items || [];

    // Fetch floor_content
    let floorContent = [];
    if (floors.length > 0) {
      const floorIds = floors.map(f => f.id);
      const fcResp = await api(`collections/floor_content/records?filter=(floor='${floorIds.join("'||floor='")}')&perPage=200`);
      floorContent = fcResp.items || [];
    }

    // Fetch group_content
    let groupContent = [];
    if (groups.length > 0) {
      const groupIds = groups.map(g => g.id);
      const gcResp = await api(`collections/group_content/records?filter=(group='${groupIds.join("'||group='")}')&perPage=200`);
      groupContent = gcResp.items || [];
    }

    // Fetch object_content, object_images, image_content, video_subtitles
    let objectContent = [];
    let objectImages = [];
    let imageContent = [];
    let videoSubtitles = [];
    if (objects.length > 0) {
      const objIds = objects.map(o => o.id);
      const ocResp = await api(`collections/object_content/records?filter=(object='${objIds.join("'||object='")}')&perPage=500`);
      objectContent = ocResp.items || [];

      const oiResp = await api(`collections/object_images/records?filter=(object='${objIds.join("'||object='")}')&sort=sort_order&perPage=500`);
      objectImages = oiResp.items || [];

      if (objectImages.length > 0) {
        const imgIds = objectImages.map(i => i.id);
        const icResp = await api(`collections/image_content/records?filter=(image='${imgIds.join("'||image='")}')&perPage=1000`);
        imageContent = icResp.items || [];

        const videoItems = objectImages.filter(i => i.media_type === "video");
        if (videoItems.length > 0) {
          const vIds = videoItems.map(v => v.id);
          try {
            const vsResp = await api(`collections/video_subtitles/records?filter=(media='${vIds.join("'||media='")}')&perPage=500`);
            videoSubtitles = vsResp.items || [];
          } catch (e) { /* video_subtitles collection may not exist */ }
        }
      }
    }

    // Helper to download a binary file
    async function downloadFile(collection, recordId, filename) {
      const url = fileUrl(collection, recordId, filename);
      const resp = await fetch(url, { headers: { Authorization: "Bearer " + authToken } });
      if (!resp.ok) throw new Error(`Failed to download ${filename}`);
      return await resp.blob();
    }

    // Build ZIP
    const zip = new JSZip();

    // Helper to get file extension
    function getExt(filename) {
      const parts = filename.split(".");
      return parts.length > 1 ? "." + parts[parts.length - 1].toLowerCase() : "";
    }

    // Download and add set logo
    let logoPath = null;
    if (set.logo) {
      const ext = getExt(set.logo);
      logoPath = "files/logo" + ext;
      const blob = await downloadFile("sets", setId, set.logo);
      zip.file(logoPath, blob);
    }

    // Download and add custom font
    let fontPath = null;
    if (set.custom_font) {
      const ext = getExt(set.custom_font);
      fontPath = "files/custom_font" + ext;
      const blob = await downloadFile("sets", setId, set.custom_font);
      zip.file(fontPath, blob);
    }

    // Download floor maps
    const floorMapPaths = {};
    for (const floor of floors) {
      if (floor.map_image) {
        const ext = getExt(floor.map_image);
        const label = (floor.label || "floor").toLowerCase().replace(/[^a-z0-9]/g, "-");
        const path = `files/floors/${label}-map${ext}`;
        floorMapPaths[floor.id] = path;
        const blob = await downloadFile("floors", floor.id, floor.map_image);
        zip.file(path, blob);
      }
    }

    // Download object files (audio, subtitles, images, models, videos, video_subtitles)
    const objectFilePaths = {}; // { objectId: { lang: { audio: path, subtitles: path }, images: [...] } }
    for (const obj of objects) {
      const slug = obj.slug || obj.id;
      objectFilePaths[obj.id] = { content: {}, images: [] };

      // Object content files (audio, subtitles)
      const objContents = objectContent.filter(c => c.object === obj.id);
      for (const oc of objContents) {
        const lang = oc.language;
        objectFilePaths[obj.id].content[lang] = {};
        if (oc.audio) {
          const ext = getExt(oc.audio);
          const path = `files/objects/${slug}/audio-${lang}${ext}`;
          objectFilePaths[obj.id].content[lang].audio = path;
          const blob = await downloadFile("object_content", oc.id, oc.audio);
          zip.file(path, blob);
        }
        if (oc.subtitles) {
          const ext = getExt(oc.subtitles);
          const path = `files/objects/${slug}/subtitles-${lang}${ext}`;
          objectFilePaths[obj.id].content[lang].subtitles = path;
          const blob = await downloadFile("object_content", oc.id, oc.subtitles);
          zip.file(path, blob);
        }
      }

      // Object images
      const objImages = objectImages.filter(i => i.object === obj.id);
      for (let idx = 0; idx < objImages.length; idx++) {
        const img = objImages[idx];
        const imgPaths = {};

        if (img.image) {
          const ext = getExt(img.image);
          const mediaPrefix = img.media_type === "image" ? "image" : img.media_type === "360" ? "image" : img.media_type === "3d" ? "image" : "image";
          const path = `files/objects/${slug}/images/${mediaPrefix}-${idx + 1}${ext}`;
          imgPaths.image = path;
          const blob = await downloadFile("object_images", img.id, img.image);
          zip.file(path, blob);
        }

        if (img.model_file) {
          const ext = getExt(img.model_file);
          const path = `files/objects/${slug}/images/model-${idx + 1}${ext}`;
          imgPaths.model_file = path;
          const blob = await downloadFile("object_images", img.id, img.model_file);
          zip.file(path, blob);
        }

        if (img.video_file) {
          const ext = getExt(img.video_file);
          const path = `files/objects/${slug}/images/video-${idx + 1}${ext}`;
          imgPaths.video_file = path;
          const blob = await downloadFile("object_images", img.id, img.video_file);
          zip.file(path, blob);
        }

        // Video subtitles for this image
        const imgVideoSubs = videoSubtitles.filter(vs => vs.media === img.id);
        const videoSubPaths = {};
        for (const vs of imgVideoSubs) {
          const ext = getExt(vs.subtitles);
          const path = `files/video-subtitles/${slug}/subs-${vs.language}${ext}`;
          videoSubPaths[vs.language] = path;
          const blob = await downloadFile("video_subtitles", vs.id, vs.subtitles);
          zip.file(path, blob);
        }
        imgPaths.videoSubPaths = videoSubPaths;

        // Captions
        const imgCaptions = imageContent.filter(ic => ic.image === img.id);
        const captions = {};
        for (const ic of imgCaptions) {
          captions[ic.language] = ic.caption || "";
        }
        imgPaths.captions = captions;
        imgPaths.sort_order = img.sort_order;
        imgPaths.media_type = img.media_type || "image";

        objectFilePaths[obj.id].images.push(imgPaths);
      }
    }

    // Build manifest
    const manifest = {
      augus_version: "1.0",
      exported_at: new Date().toISOString(),
      set: {
        slug: set.slug,
        available_languages: set.available_languages || [],
        color_primary: set.color_primary || "#0057b8",
        color_accent: set.color_accent || "#ffffff",
        sequential_navigation: !!set.sequential_navigation,
        show_numbers: set.show_numbers !== false,
        show_augus_branding: set.show_augus_branding !== false,
        treasure_hunt: !!set.treasure_hunt,
        subtitle_font: set.subtitle_font || "",
        logo: logoPath,
        custom_font: fontPath,
        content: {},
      },
      floors: [],
      groups: [],
      objects: [],
    };

    // Set content
    for (const sc of setContent) {
      manifest.set.content[sc.language] = {
        name: sc.name || "",
        description: sc.description || "",
        about: sc.about || "",
      };
    }

    // Floors
    for (const floor of floors) {
      const fc = floorContent.filter(c => c.floor === floor.id);
      const content = {};
      for (const c of fc) {
        content[c.language] = { label: c.label || "", name: c.name || "" };
      }
      manifest.floors.push({
        label: floor.label || "",
        sort_order: floor.sort_order,
        type: floor.type || "indoor",
        map_image: floorMapPaths[floor.id] || null,
        center_lat: floor.center_lat || null,
        center_lng: floor.center_lng || null,
        zoom_level: floor.zoom_level || null,
        is_default: floor.id === set.default_floor,
        content: content,
      });
    }

    // Groups
    for (const group of groups) {
      const gc = groupContent.filter(c => c.group === group.id);
      const content = {};
      for (const c of gc) {
        content[c.language] = { title: c.title || "" };
      }
      manifest.groups.push({
        sort_order: group.sort_order,
        color: group.color || "",
        content: content,
      });
    }

    // Objects
    for (const obj of objects) {
      const slug = obj.slug || obj.id;
      const objContents = objectContent.filter(c => c.object === obj.id);
      const content = {};
      for (const oc of objContents) {
        const filePaths = objectFilePaths[obj.id].content[oc.language] || {};
        content[oc.language] = {
          name: oc.name || "",
          description: oc.description || "",
          audio: filePaths.audio || null,
          subtitles: filePaths.subtitles || null,
        };
      }

      // Resolve floor_index and group_index
      const floorIndex = obj.floor ? floors.findIndex(f => f.id === obj.floor) : null;
      const groupIndex = obj.group ? groups.findIndex(g => g.id === obj.group) : null;

      // Images
      const images = objectFilePaths[obj.id].images.map(imgPaths => ({
        sort_order: imgPaths.sort_order,
        media_type: imgPaths.media_type,
        image: imgPaths.image || null,
        model_file: imgPaths.model_file || null,
        video_file: imgPaths.video_file || null,
        captions: imgPaths.captions || {},
        video_subtitles: imgPaths.videoSubPaths || {},
      }));

      manifest.objects.push({
        slug: slug,
        sort_order: obj.sort_order,
        default_language: obj.default_language || "en",
        published: obj.published !== false,
        map_x: obj.map_x ?? null,
        map_y: obj.map_y ?? null,
        floor_index: floorIndex >= 0 ? floorIndex : null,
        group_index: groupIndex >= 0 ? groupIndex : null,
        latitude: obj.latitude || null,
        longitude: obj.longitude || null,
        trigger_radius: obj.trigger_radius || null,
        content: content,
        images: images,
      });
    }

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // Generate and download
    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${set.slug}.augus.zip`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("Export complete!");
  } catch (e) {
    console.error("Export error:", e);
    if (e.message && e.message.includes("Unauthorized")) {
      showToast("Export failed: Your session has expired. Please log in again and retry.");
    } else if (e.message && e.message.includes("fetch")) {
      showToast("Export failed: Could not download files from the server. Check your internet connection and try again.");
    } else {
      showToast("Export failed: " + (e.message || "An unexpected error occurred. Check the browser console for details."));
    }
  }
}

async function importSet() {
  const fileInput = $("#importSetFile");
  const file = fileInput.files[0];
  if (!file) return;
  fileInput.value = "";

  if (!file.name.endsWith(".zip") && !file.name.endsWith(".augus.zip")) {
    showToast("Please select a .augus.zip file exported from Augus.");
    return;
  }

  try {
    showToast("Reading ZIP file...");
    const zip = await JSZip.loadAsync(file);

    // Find manifest.json (may be at root or inside a folder)
    let manifestFile = zip.file("manifest.json");
    if (!manifestFile) {
      // Check inside a subfolder
      const files = Object.keys(zip.files);
      const manifestPath = files.find(f => f.endsWith("/manifest.json") || f === "manifest.json");
      if (manifestPath) manifestFile = zip.file(manifestPath);
    }
    if (!manifestFile) {
      showToast("This doesn't look like an Augus export file — manifest.json is missing. Make sure you're importing a .augus.zip file exported from Augus.");
      return;
    }

    const manifestText = await manifestFile.async("string");
    const manifest = JSON.parse(manifestText);

    if (!manifest.set || !manifest.set.slug) {
      showToast("Invalid manifest: the file is missing set data. Make sure this is a valid Augus export file.");
      return;
    }
    if (!manifest.augus_version) {
      showToast("Warning: this export file has no version number. It may be from an older version of Augus. Attempting import anyway...");
    }

    // Determine file prefix (in case files are nested in a folder)
    const manifestPath = manifestFile.name;
    const prefix = manifestPath.includes("/") ? manifestPath.substring(0, manifestPath.lastIndexOf("/") + 1) : "";

    // Helper to get a file from the ZIP
    function getZipFile(path) {
      if (!path) return null;
      return zip.file(prefix + path) || zip.file(path);
    }

    // Check if slug already exists, if so append "-imported"
    let slug = manifest.set.slug;
    try {
      const existingResp = await api(`collections/sets/records?filter=(slug='${encodeURIComponent(slug)}')&perPage=1`);
      if (existingResp.items && existingResp.items.length > 0) {
        slug = slug + "-imported";
      }
    } catch (e) { /* ignore */ }

    showToast("Importing set...");

    // 1. Create the set record
    const setData = new FormData();
    setData.append("slug", slug);
    setData.append("name_en", Object.values(manifest.set.content || {})[0]?.name || slug);
    setData.append("color_primary", manifest.set.color_primary || "#0057b8");
    setData.append("color_accent", manifest.set.color_accent || "#ffffff");
    setData.append("subtitle_font", manifest.set.subtitle_font || "");

    // Upload logo if present
    if (manifest.set.logo) {
      const logoFile = getZipFile(manifest.set.logo);
      if (logoFile) {
        const logoBlob = await logoFile.async("blob");
        const ext = manifest.set.logo.split(".").pop();
        setData.append("logo", new File([logoBlob], "logo." + ext));
      }
    }

    // Upload custom font if present
    if (manifest.set.custom_font) {
      const fontFile = getZipFile(manifest.set.custom_font);
      if (fontFile) {
        const fontBlob = await fontFile.async("blob");
        const ext = manifest.set.custom_font.split(".").pop();
        setData.append("custom_font", new File([fontBlob], "custom_font." + ext));
      }
    }

    const createdSet = await api("collections/sets/records", { method: "POST", body: setData });
    const newSetId = createdSet.id;

    // Save booleans and available_languages
    await api(`collections/sets/records/${newSetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        published: false,
        sequential_navigation: !!manifest.set.sequential_navigation,
        show_numbers: manifest.set.show_numbers !== false,
        show_augus_branding: manifest.set.show_augus_branding !== false,
        treasure_hunt: !!manifest.set.treasure_hunt,
        available_languages: manifest.set.available_languages || [],
      }),
    });

    // 2. Create set_content records
    for (const [lang, content] of Object.entries(manifest.set.content || {})) {
      await api("collections/set_content/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          set: newSetId,
          language: lang,
          name: content.name || "",
          description: content.description || "",
          about: content.about || "",
        }),
      });
    }

    // 3. Create floors
    const floorIdMap = []; // index -> new floor ID
    for (let i = 0; i < (manifest.floors || []).length; i++) {
      const floor = manifest.floors[i];
      showToast(`Importing... (floor ${i + 1}/${manifest.floors.length})`);
      const floorData = new FormData();
      floorData.append("set", newSetId);
      floorData.append("label", floor.label || String(i + 1));
      floorData.append("sort_order", String(floor.sort_order || i + 1));
      floorData.append("type", floor.type || "indoor");
      if (floor.center_lat) floorData.append("center_lat", String(floor.center_lat));
      if (floor.center_lng) floorData.append("center_lng", String(floor.center_lng));
      if (floor.zoom_level) floorData.append("zoom_level", String(floor.zoom_level));

      // Upload map image
      if (floor.map_image) {
        const mapFile = getZipFile(floor.map_image);
        if (mapFile) {
          const mapBlob = await mapFile.async("blob");
          const ext = floor.map_image.split(".").pop();
          floorData.append("map_image", new File([mapBlob], "map." + ext));
        }
      }

      const createdFloor = await api("collections/floors/records", { method: "POST", body: floorData });
      floorIdMap.push(createdFloor.id);

      // Create floor_content
      for (const [lang, content] of Object.entries(floor.content || {})) {
        await api("collections/floor_content/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            floor: createdFloor.id,
            language: lang,
            label: content.label || "",
            name: content.name || "",
          }),
        });
      }
    }

    // Set default floor
    const defaultFloorIdx = (manifest.floors || []).findIndex(f => f.is_default);
    if (defaultFloorIdx >= 0 && floorIdMap[defaultFloorIdx]) {
      await api(`collections/sets/records/${newSetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ default_floor: floorIdMap[defaultFloorIdx] }),
      });
    }

    // 4. Create groups
    const groupIdMap = []; // index -> new group ID
    for (let i = 0; i < (manifest.groups || []).length; i++) {
      const group = manifest.groups[i];
      const createdGroup = await api("collections/groups/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          set: newSetId,
          sort_order: group.sort_order || i + 1,
          color: group.color || "",
        }),
      });
      groupIdMap.push(createdGroup.id);

      // Create group_content
      for (const [lang, content] of Object.entries(group.content || {})) {
        await api("collections/group_content/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            group: createdGroup.id,
            language: lang,
            title: content.title || "",
          }),
        });
      }
    }

    // 5. Create objects
    const totalObjects = (manifest.objects || []).length;
    for (let i = 0; i < totalObjects; i++) {
      const obj = manifest.objects[i];
      showToast(`Importing... (${i + 1}/${totalObjects} objects)`);

      const objData = new FormData();
      objData.append("set", newSetId);
      objData.append("slug", obj.slug || `object-${i + 1}`);
      objData.append("sort_order", String(obj.sort_order || i + 1));
      objData.append("default_language", obj.default_language || "en");
      objData.append("name_en", Object.values(obj.content || {})[0]?.name || "");
      objData.append("published", obj.published !== false ? "true" : "false");

      if (obj.map_x != null && obj.map_x !== -1) objData.append("map_x", String(obj.map_x));
      if (obj.map_y != null && obj.map_y !== -1) objData.append("map_y", String(obj.map_y));
      if (obj.latitude) objData.append("latitude", String(obj.latitude));
      if (obj.longitude) objData.append("longitude", String(obj.longitude));
      if (obj.trigger_radius) objData.append("trigger_radius", String(obj.trigger_radius));

      // Resolve floor and group references
      if (obj.floor_index != null && floorIdMap[obj.floor_index]) {
        objData.append("floor", floorIdMap[obj.floor_index]);
      }
      if (obj.group_index != null && groupIdMap[obj.group_index]) {
        objData.append("group", groupIdMap[obj.group_index]);
      }

      const createdObj = await api("collections/objects/records", { method: "POST", body: objData });

      // Set published via JSON PATCH (boolean)
      await api(`collections/objects/records/${createdObj.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: obj.published !== false }),
      });

      // Create object_content (with audio/subtitles files)
      for (const [lang, content] of Object.entries(obj.content || {})) {
        const contentForm = new FormData();
        contentForm.append("object", createdObj.id);
        contentForm.append("language", lang);
        contentForm.append("name", content.name || "");
        contentForm.append("description", content.description || "");

        if (content.audio) {
          const audioFile = getZipFile(content.audio);
          if (audioFile) {
            const audioBlob = await audioFile.async("blob");
            const ext = content.audio.split(".").pop();
            contentForm.append("audio", new File([audioBlob], `audio-${lang}.${ext}`));
          }
        }

        if (content.subtitles) {
          const subsFile = getZipFile(content.subtitles);
          if (subsFile) {
            const subsBlob = await subsFile.async("blob");
            const ext = content.subtitles.split(".").pop();
            contentForm.append("subtitles", new File([subsBlob], `subtitles-${lang}.${ext}`));
          }
        }

        await api("collections/object_content/records", { method: "POST", body: contentForm });
      }

      // Create object_images
      for (const img of (obj.images || [])) {
        const imgForm = new FormData();
        imgForm.append("object", createdObj.id);
        imgForm.append("sort_order", String(img.sort_order || 1));
        imgForm.append("media_type", img.media_type || "image");

        if (img.image) {
          const imgFile = getZipFile(img.image);
          if (imgFile) {
            const imgBlob = await imgFile.async("blob");
            const ext = img.image.split(".").pop();
            imgForm.append("image", new File([imgBlob], `image.${ext}`));
          }
        }

        if (img.model_file) {
          const modelFile = getZipFile(img.model_file);
          if (modelFile) {
            const modelBlob = await modelFile.async("blob");
            const ext = img.model_file.split(".").pop();
            imgForm.append("model_file", new File([modelBlob], `model.${ext}`));
          }
        }

        if (img.video_file) {
          const videoFile = getZipFile(img.video_file);
          if (videoFile) {
            const videoBlob = await videoFile.async("blob");
            const ext = img.video_file.split(".").pop();
            imgForm.append("video_file", new File([videoBlob], `video.${ext}`));
          }
        }

        const createdImg = await api("collections/object_images/records", { method: "POST", body: imgForm });

        // Create image_content (captions)
        for (const [lang, caption] of Object.entries(img.captions || {})) {
          if (caption) {
            await api("collections/image_content/records", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                image: createdImg.id,
                language: lang,
                caption: caption,
              }),
            });
          }
        }

        // Create video_subtitles
        for (const [lang, subsPath] of Object.entries(img.video_subtitles || {})) {
          if (subsPath) {
            const subsFile = getZipFile(subsPath);
            if (subsFile) {
              const subsBlob = await subsFile.async("blob");
              const ext = subsPath.split(".").pop();
              const subsForm = new FormData();
              subsForm.append("media", createdImg.id);
              subsForm.append("language", lang);
              subsForm.append("subtitles", new File([subsBlob], `subs-${lang}.${ext}`));
              await api("collections/video_subtitles/records", { method: "POST", body: subsForm });
            }
          }
        }
      }
    }

    showToast("Import complete! Set created as /" + slug);
    loadSets();
  } catch (e) {
    console.error("Import error:", e);
    if (e.message && e.message.includes("Unauthorized")) {
      showToast("Import failed: Your session has expired. Please log in again and retry.");
    } else if (e.message && e.message.includes("slug")) {
      showToast("Import failed: A set with this URL slug already exists. Try deleting it first or rename the slug in the manifest.");
    } else if (e.message && e.message.includes("file size")) {
      showToast("Import failed: One of the media files exceeds the maximum allowed size. Check your server's upload limits.");
    } else if (e.message && e.message.includes("JSON")) {
      showToast("Import failed: The manifest.json file is corrupted or not valid JSON. Try exporting the set again.");
    } else {
      showToast("Import failed: " + (e.message || "An unexpected error occurred. Some data may have been partially imported — check the sets list. See browser console for details."));
    }
  }
}

// ===== B1: Batch Operations Helpers =====
function getCheckedObjectIds() {
  const checkboxes = document.querySelectorAll(".object-card__checkbox:checked");
  return Array.from(checkboxes).map(cb => cb.dataset.objectId).filter(Boolean);
}

function updateBatchBar() {
  const checked = getCheckedObjectIds();
  const bar = $("#batchBar");
  if (checked.length > 0) {
    bar.classList.remove("hidden");
    $("#batchCount").textContent = checked.length + " selected";
  } else {
    bar.classList.add("hidden");
  }
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
