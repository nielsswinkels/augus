// ============================================
// Augus — Admin Application
// ============================================

const PB_URL = window.location.origin;

// ===== State =====
let authToken = sessionStorage.getItem("augus_admin_token") || "";
let currentSets = [];
let currentObjects = [];
let editingSet = null;
let editingObject = null;
let selectedSetId = "";
let formDirty = false;

// ===== DOM =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== API =====
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
    throw new Error(err.message || `API error: ${resp.status}`);
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
    renderSetsList();
  } catch (e) {
    showToast("Failed to load sets: " + e.message);
  }
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
        <div class="set-card__name">${esc(set.name_en)}${set.published ? "" : ' <span class="set-card__draft">Draft</span>'}</div>
        <div class="set-card__slug">/${esc(set.slug)}</div>
      </div>
    `;
    card.addEventListener("click", () => editSet(set));
    card.addEventListener("keydown", (e) => { if (e.key === "Enter") editSet(set); });
    container.appendChild(card);
  }
}

function editSet(set) {
  editingSet = set;
  formDirty = false;
  $("#setFormTitle").textContent = set ? "Edit Set" : "New Set";
  $("#panelSets").classList.add("hidden");
  $("#panelSetForm").classList.remove("hidden");

  if (set) {
    $("#setFormId").value = set.id;
    $("#setSlug").value = set.slug;
    $("#setNameEn").value = set.name_en || "";
    $("#setNameSv").value = set.name_sv || "";
    $("#setDescEn").value = set.description_en || "";
    $("#setDescSv").value = set.description_sv || "";
    $("#btnDeleteSet").classList.remove("hidden");
    $("#btnGoToObjects").style.display = "";

    if (set.map_image) {
      const url = fileUrl("sets", set.id, set.map_image);
      $("#setMapImageCurrent").innerHTML = `Current: ${esc(set.map_image)} <button class="current-file__remove" data-field="map_image" title="Remove">&times;</button>`;
      $("#setMapImageCurrent").classList.remove("hidden");
    } else {
      $("#setMapImageCurrent").classList.add("hidden");
    }

    $("#setPublished").checked = !!set.published;

    const primary = set.color_primary || "#0057b8";
    const accent = set.color_accent || "#ffffff";
    $("#setColorPrimary").value = primary;
    $("#setColorPrimaryText").value = primary;
    $("#setColorAccent").value = accent;
    $("#setColorAccentText").value = accent;
  } else {
    $("#setFormId").value = "";
    $("#setSlug").value = "";
    $("#setNameEn").value = "";
    $("#setNameSv").value = "";
    $("#setDescEn").value = "";
    $("#setDescSv").value = "";
    $("#setMapImage").value = "";
    $("#setMapImageCurrent").classList.add("hidden");
    $("#setColorPrimary").value = "#0057b8";
    $("#setColorPrimaryText").value = "#0057b8";
    $("#setColorAccent").value = "#ffffff";
    $("#setColorAccentText").value = "#ffffff";
    $("#setPublished").checked = false;
    $("#btnDeleteSet").classList.add("hidden");
    $("#btnGoToObjects").style.display = "none";
  }
}

async function saveSet(e) {
  e.preventDefault();
  const id = $("#setFormId").value;
  const slug = $("#setSlug").value.trim();
  const reserved = ["admin", "api", "_", "js", "css"];
  if (reserved.includes(slug)) {
    showToast(`"${slug}" is a reserved name and cannot be used as a slug.`);
    return;
  }
  const formData = new FormData();
  formData.append("slug", slug);
  formData.append("name_en", $("#setNameEn").value.trim());
  formData.append("name_sv", $("#setNameSv").value.trim());
  formData.append("description_en", $("#setDescEn").value.trim());
  formData.append("description_sv", $("#setDescSv").value.trim());

  const mapFile = $("#setMapImage").files[0];
  if (mapFile) formData.append("map_image", mapFile);

  const primaryVal = $("#setColorPrimaryText").value;
  const accentVal = $("#setColorAccentText").value;
  formData.append("color_primary", /^#[0-9a-fA-F]{6}$/.test(primaryVal) ? primaryVal : $("#setColorPrimary").value);
  formData.append("color_accent", /^#[0-9a-fA-F]{6}$/.test(accentVal) ? accentVal : $("#setColorAccent").value);
  formData.append("published", $("#setPublished").checked);

  try {
    if (id) {
      await api(`collections/sets/records/${id}`, { method: "PATCH", body: formData });
    } else {
      await api("collections/sets/records", { method: "POST", body: formData });
    }
    showToast("Set saved!");
    formDirty = false;
    showTab("sets");
  } catch (e) {
    showToast("Error: " + e.message);
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
      showToast("Error: " + e.message);
    }
  });
}

// ===== OBJECTS =====
async function loadObjectSetFilter() {
  try {
    const resp = await api("collections/sets/records?sort=name_en&perPage=200");
    currentSets = resp.items || [];
    const select = $("#objectSetFilter");
    select.innerHTML = '<option value="">Select a set...</option>';
    for (const set of currentSets) {
      const opt = document.createElement("option");
      opt.value = set.id;
      opt.textContent = set.name_en;
      select.appendChild(opt);
    }
    if (selectedSetId) {
      select.value = selectedSetId;
      loadObjects(selectedSetId);
    }
  } catch (e) {
    showToast("Failed to load sets");
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
    renderObjectsList();
    $("#btnNewObject").classList.remove("hidden");
  } catch (e) {
    showToast("Failed to load objects: " + e.message);
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
      <span class="object-card__number">${obj.sort_order}</span>
      <div class="object-card__info">
        <div class="object-card__name">${esc(obj.name_en)}</div>
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
        showToast("Error saving order: " + err.message);
      }
    });

    container.appendChild(card);
  }
}

async function editObject(obj) {
  editingObject = obj;
  formDirty = false;
  $("#objectFormTitle").textContent = obj ? "Edit Object" : "New Object";
  $("#panelObjects").classList.add("hidden");
  $("#panelObjectForm").classList.remove("hidden");

  if (obj) {
    $("#objectFormId").value = obj.id;
    $("#objectFormSetId").value = obj.set;
    $("#objectSlug").value = obj.slug;
    $("#objectSortOrder").value = obj.sort_order;
    $("#objectDefaultLang").value = obj.default_language || "en";
    $("#objectNameEn").value = obj.name_en || "";
    $("#objectNameSv").value = obj.name_sv || "";
    $("#objectMapX").value = obj.map_x ?? "";
    $("#objectMapY").value = obj.map_y ?? "";
    $("#btnDeleteObject").classList.remove("hidden");
    $("#btnPreviewObject").classList.remove("hidden");
    $("#btnQRCode").classList.remove("hidden");
    $("#btnDuplicateObject").classList.remove("hidden");

    // Show current files
    showCurrentFile("objectAudioEnCurrent", obj.audio_en, "objects", obj.id, "audio_en");
    showCurrentFile("objectAudioSvCurrent", obj.audio_sv, "objects", obj.id, "audio_sv");
    showCurrentFile("objectSubtitlesEnCurrent", obj.subtitles_en, "objects", obj.id, "subtitles_en");
    showCurrentFile("objectSubtitlesSvCurrent", obj.subtitles_sv, "objects", obj.id, "subtitles_sv");

    // Load images
    loadObjectImages(obj.id);

    // Set up map picker
    setupMapPicker(obj);
  } else {
    $("#objectFormId").value = "";
    $("#objectFormSetId").value = selectedSetId;
    $("#objectSlug").value = "";
    $("#objectSortOrder").value = currentObjects.length + 1;
    $("#objectDefaultLang").value = "en";
    $("#objectNameEn").value = "";
    $("#objectNameSv").value = "";
    $("#objectMapX").value = "";
    $("#objectMapY").value = "";
    ["objectAudioEnCurrent", "objectAudioSvCurrent", "objectSubtitlesEnCurrent", "objectSubtitlesSvCurrent"]
      .forEach((id) => $(`#${id}`).classList.add("hidden"));
    $("#btnDeleteObject").classList.add("hidden");
    $("#btnPreviewObject").classList.add("hidden");
    $("#btnQRCode").classList.add("hidden");
    $("#btnDuplicateObject").classList.add("hidden");
    $("#imagesGrid").innerHTML = "";
    setupMapPicker(null);
  }

  // Clear file inputs
  ["objectAudioEn", "objectAudioSv", "objectSubtitlesEn", "objectSubtitlesSv"].forEach((id) => {
    $(`#${id}`).value = "";
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
  const id = $("#objectFormId").value;
  const formData = new FormData();
  formData.append("set", $("#objectFormSetId").value || selectedSetId);
  formData.append("slug", $("#objectSlug").value.trim());
  formData.append("sort_order", parseInt($("#objectSortOrder").value) || 1);
  formData.append("default_language", $("#objectDefaultLang").value);
  formData.append("name_en", $("#objectNameEn").value.trim());
  formData.append("name_sv", $("#objectNameSv").value.trim());

  const mapX = $("#objectMapX").value;
  const mapY = $("#objectMapY").value;
  formData.append("map_x", mapX !== "" ? parseFloat(mapX) : -1);
  formData.append("map_y", mapY !== "" ? parseFloat(mapY) : -1);

  // File uploads
  const audioEn = $("#objectAudioEn").files[0];
  if (audioEn) formData.append("audio_en", audioEn);
  const audioSv = $("#objectAudioSv").files[0];
  if (audioSv) formData.append("audio_sv", audioSv);
  const subEn = $("#objectSubtitlesEn").files[0];
  if (subEn) formData.append("subtitles_en", subEn);
  const subSv = $("#objectSubtitlesSv").files[0];
  if (subSv) formData.append("subtitles_sv", subSv);

  try {
    if (id) {
      const result = await api(`collections/objects/records/${id}`, { method: "PATCH", body: formData });
      editingObject = result;
    } else {
      const result = await api("collections/objects/records", { method: "POST", body: formData });
      editingObject = result;
      $("#objectFormId").value = result.id;
      // Show buttons now that object exists
      $("#btnDeleteObject").classList.remove("hidden");
      $("#btnPreviewObject").classList.remove("hidden");
      $("#btnQRCode").classList.remove("hidden");
    }
    showToast("Object saved!");
    formDirty = false;
  } catch (e) {
    showToast("Error: " + e.message);
  }
}

function deleteObject() {
  if (!editingObject) return;
  confirmAction($("#btnDeleteObject"), async () => {
    try {
      await api(`collections/objects/records/${editingObject.id}`, { method: "DELETE" });
      showToast("Object deleted");
      formDirty = false;
      backToObjects();
    } catch (e) {
      showToast("Error: " + e.message);
    }
  });
}

function backToObjects() {
  $("#panelObjectForm").classList.add("hidden");
  $("#panelObjects").classList.remove("hidden");
  loadObjects(selectedSetId);
}

function duplicateObject() {
  if (!editingObject) return;
  // Open form in "new" mode with duplicated data pre-filled
  $("#objectFormTitle").textContent = "New Object (Duplicate)";
  $("#objectFormId").value = "";
  $("#objectFormSetId").value = editingObject.set;
  $("#objectSlug").value = editingObject.slug + "-copy";
  $("#objectSortOrder").value = currentObjects.length + 1;
  $("#objectDefaultLang").value = editingObject.default_language || "en";
  $("#objectNameEn").value = editingObject.name_en || "";
  $("#objectNameSv").value = editingObject.name_sv || "";
  $("#objectMapX").value = editingObject.map_x ?? "";
  $("#objectMapY").value = editingObject.map_y ?? "";

  // Clear file inputs (files can't be duplicated)
  ["objectAudioEn", "objectAudioSv", "objectSubtitlesEn", "objectSubtitlesSv"].forEach((id) => {
    $(`#${id}`).value = "";
  });
  ["objectAudioEnCurrent", "objectAudioSvCurrent", "objectSubtitlesEnCurrent", "objectSubtitlesSvCurrent"]
    .forEach((id) => $(`#${id}`).classList.add("hidden"));

  // Reset state to new object mode
  editingObject = null;
  $("#btnDeleteObject").classList.add("hidden");
  $("#btnPreviewObject").classList.add("hidden");
  $("#btnQRCode").classList.add("hidden");
  $("#btnDuplicateObject").classList.add("hidden");
  $("#imagesGrid").innerHTML = "";

  formDirty = true;
}

// ===== MAP PICKER =====
function setupMapPicker(obj) {
  const set = currentSets.find((s) => s.id === (obj ? obj.set : selectedSetId));
  const container = $("#mapPickerContainer");
  const noMap = $("#mapPickerNoMap");
  const picker = $("#mapPicker");
  const img = $("#mapPickerImage");
  const pin = $("#mapPickerPin");
  const pinLabel = $("#mapPickerPinLabel");

  if (!set || !set.map_image) {
    container.classList.add("hidden");
    noMap.classList.remove("hidden");
    return;
  }

  noMap.classList.add("hidden");
  container.classList.remove("hidden");
  img.src = fileUrl("sets", set.id, set.map_image);
  pinLabel.textContent = obj ? obj.sort_order : "";

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

// ===== IMAGES =====
async function loadObjectImages(objectId) {
  try {
    const resp = await api(`collections/object_images/records?filter=(object='${encodeURIComponent(objectId)}')&sort=sort_order&perPage=100`);
    renderImagesGrid(resp.items || []);
  } catch (e) {
    showToast("Failed to load images");
  }
}

function renderImagesGrid(images) {
  const grid = $("#imagesGrid");
  grid.innerHTML = "";
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const url = fileUrl("object_images", img.id, img.image);
    const card = document.createElement("div");
    card.className = "image-card";
    card.dataset.imageId = img.id;
    card.innerHTML = `
      <div class="image-card__order">
        <button class="btn image-card__move" data-move="-1" data-index="${i}" title="Move up" ${i === 0 ? "disabled" : ""}>▲</button>
        <span class="image-card__order-num">${i + 1}</span>
        <button class="btn image-card__move" data-move="1" data-index="${i}" title="Move down" ${i === images.length - 1 ? "disabled" : ""}>▼</button>
      </div>
      <img src="${url}" alt="${esc(img.caption_en || '')}" loading="lazy">
      <div class="image-card__caption image-card__caption--display">${esc(img.caption_en || img.caption_sv || "No caption")}</div>
      <div class="image-card__edit-fields" style="display:none">
        <label class="form-label" style="font-size:0.8rem">Caption (English)</label>
        <input type="text" class="form-input image-caption-en" value="${esc(img.caption_en || '')}" placeholder="English caption">
        <label class="form-label" style="font-size:0.8rem;margin-top:0.25rem">Caption (Svenska)</label>
        <input type="text" class="form-input image-caption-sv" value="${esc(img.caption_sv || '')}" placeholder="Swedish caption">
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
        showToast("Error: " + e.message);
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
      const captionEn = card.querySelector(".image-caption-en").value.trim();
      const captionSv = card.querySelector(".image-caption-sv").value.trim();
      try {
        await api(`collections/object_images/records/${btn.dataset.saveImage}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption_en: captionEn, caption_sv: captionSv }),
        });
        showToast("Caption saved!");
        loadObjectImages(editingObject.id);
      } catch (e) {
        showToast("Error: " + e.message);
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
          showToast("Error: " + e.message);
        }
      });
    });
  });
}

async function uploadImage(e) {
  e.preventDefault();
  if (!editingObject || !$("#objectFormId").value) {
    showToast("Save the object first before uploading images");
    return;
  }

  const objectId = $("#objectFormId").value;
  const formData = new FormData();
  formData.append("object", objectId);
  formData.append("image", $("#imageFile").files[0]);
  formData.append("caption_en", $("#imageCaptionEn").value.trim());
  formData.append("caption_sv", $("#imageCaptionSv").value.trim());

  // Determine sort order (next available)
  const currentImages = $("#imagesGrid").children.length;
  formData.append("sort_order", currentImages + 1);

  try {
    await api("collections/object_images/records", { method: "POST", body: formData });
    showToast("Image uploaded!");
    $("#imageFile").value = "";
    $("#imageCaptionEn").value = "";
    $("#imageCaptionSv").value = "";
    loadObjectImages(objectId);
  } catch (e) {
    showToast("Error: " + e.message);
  }
}

// ===== QR CODE =====
function generateQRCode() {
  if (!editingObject) return;

  // Find the set slug
  const set = currentSets.find((s) => s.id === editingObject.set);
  if (!set) {
    showToast("Set not found");
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
function showToast(msg) {
  // Remove existing toast
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast visible";
  toast.textContent = msg;
  toast.setAttribute("role", "alert");
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== Utility =====
function esc(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
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
    btn.textContent = originalText;
    btn.dataset.confirming = "false";
    btn.classList.remove("btn--danger-confirm");
  }, 5000);
  btn.addEventListener("click", () => clearTimeout(timeout), { once: true });
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
  $("#setForm").addEventListener("input", markDirty);
  $("#setForm").addEventListener("change", markDirty);
  $("#objectForm").addEventListener("input", markDirty);
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

  // Objects
  $("#objectSetFilter").addEventListener("change", (e) => loadObjects(e.target.value));
  $("#btnNewObject").addEventListener("click", () => editObject(null));
  $("#btnBackToObjects").addEventListener("click", () => checkDirtyAndProceed(backToObjects));
  $("#objectForm").addEventListener("submit", saveObject);
  $("#btnDeleteObject").addEventListener("click", deleteObject);

  // Images
  $("#imageUploadForm").addEventListener("submit", uploadImage);

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
        if (field === "map_image" && editingSet) {
          // Set map image removal
          const formData = new FormData();
          formData.append("map_image", "");
          await api(`collections/sets/records/${editingSet.id}`, { method: "PATCH", body: formData });
          editingSet.map_image = "";
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
        showToast("Failed to remove file: " + err.message);
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
