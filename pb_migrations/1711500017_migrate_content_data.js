migrate((app) => {
  const setContentCol = app.findCollectionByNameOrId("set_content");
  const objectContentCol = app.findCollectionByNameOrId("object_content");
  const imageContentCol = app.findCollectionByNameOrId("image_content");

  // Migrate sets
  const allSets = app.findAllRecords("sets");
  for (const s of allSets) {
    // Set available_languages to ["en", "sv"] for all existing sets
    s.set("available_languages", ["en", "sv"]);
    app.save(s);

    // Create English content row
    if (s.get("name_en") || s.get("description_en") || s.get("about_en")) {
      const en = new Record(setContentCol);
      en.set("set", s.id);
      en.set("language", "en");
      en.set("name", s.get("name_en") || "");
      en.set("description", s.get("description_en") || "");
      en.set("about", s.get("about_en") || "");
      app.save(en);
    }

    // Create Swedish content row
    if (s.get("name_sv") || s.get("description_sv") || s.get("about_sv")) {
      const sv = new Record(setContentCol);
      sv.set("set", s.id);
      sv.set("language", "sv");
      sv.set("name", s.get("name_sv") || "");
      sv.set("description", s.get("description_sv") || "");
      sv.set("about", s.get("about_sv") || "");
      app.save(sv);
    }
  }

  // Migrate objects (text fields only — file fields need special handling)
  const allObjects = app.findAllRecords("objects");
  for (const obj of allObjects) {
    if (obj.get("name_en") || obj.get("description_en")) {
      const en = new Record(objectContentCol);
      en.set("object", obj.id);
      en.set("language", "en");
      en.set("name", obj.get("name_en") || "");
      en.set("description", obj.get("description_en") || "");
      app.save(en);
    }

    if (obj.get("name_sv") || obj.get("description_sv")) {
      const sv = new Record(objectContentCol);
      sv.set("object", obj.id);
      sv.set("language", "sv");
      sv.set("name", obj.get("name_sv") || "");
      sv.set("description", obj.get("description_sv") || "");
      app.save(sv);
    }
  }

  // Migrate image captions
  const allImages = app.findAllRecords("object_images");
  for (const img of allImages) {
    if (img.get("caption_en")) {
      const en = new Record(imageContentCol);
      en.set("image", img.id);
      en.set("language", "en");
      en.set("caption", img.get("caption_en") || "");
      app.save(en);
    }

    if (img.get("caption_sv")) {
      const sv = new Record(imageContentCol);
      sv.set("image", img.id);
      sv.set("language", "sv");
      sv.set("caption", img.get("caption_sv") || "");
      app.save(sv);
    }
  }

  // NOTE: Audio and subtitle files are NOT migrated here because PocketBase
  // cannot copy files between collections in a migration. The admin UI update
  // (Phase 2) will read from old fields as fallback while new content rows
  // are populated. Audio/subtitle files will be migrated when the admin saves
  // an object, or via a separate script.

}, (app) => {
  // Revert: delete all content rows
  // (The schema migration handles dropping the collections entirely,
  // so this is just a safety measure if run independently)
  try {
    const allSetContent = app.findAllRecords("set_content");
    for (const r of allSetContent) app.delete(r);
  } catch (e) { /* collection may not exist */ }

  try {
    const allObjectContent = app.findAllRecords("object_content");
    for (const r of allObjectContent) app.delete(r);
  } catch (e) { /* collection may not exist */ }

  try {
    const allImageContent = app.findAllRecords("image_content");
    for (const r of allImageContent) app.delete(r);
  } catch (e) { /* collection may not exist */ }

  // Reset available_languages on sets
  try {
    const allSets = app.findAllRecords("sets");
    for (const s of allSets) {
      s.set("available_languages", null);
      app.save(s);
    }
  } catch (e) { /* field may not exist */ }
});
