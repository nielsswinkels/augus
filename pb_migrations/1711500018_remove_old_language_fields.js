migrate((app) => {
  function removeFields(collectionName, fieldNames) {
    const collection = app.findCollectionByNameOrId(collectionName);
    for (const name of fieldNames) {
      try {
        const f = collection.fields.getByName(name);
        if (f) collection.fields.removeById(f.id);
      } catch (e) {
        // Field may already be removed or method unavailable
      }
    }
    app.save(collection);
  }

  removeFields("sets", ["name_sv", "description_en", "description_sv", "about_en", "about_sv"]);
  removeFields("objects", ["name_sv", "description_en", "description_sv", "audio_en", "audio_sv", "subtitles_en", "subtitles_sv"]);
  removeFields("object_images", ["caption_en", "caption_sv"]);

  // Update default_language select to allow any value
  const objects = app.findCollectionByNameOrId("objects");
  const defaultLang = objects.fields.getByName("default_language");
  if (defaultLang) {
    try {
      defaultLang.values = [];
      defaultLang.required = false;
      app.save(objects);
    } catch (e) { /* skip if not applicable */ }
  }

}, (app) => {
  const sets = app.findCollectionByNameOrId("sets");
  sets.fields.add(new TextField({ name: "name_sv", required: false, maxLength: 200 }));
  sets.fields.add(new EditorField({ name: "description_en", required: false }));
  sets.fields.add(new EditorField({ name: "description_sv", required: false }));
  sets.fields.add(new EditorField({ name: "about_en", required: false }));
  sets.fields.add(new EditorField({ name: "about_sv", required: false }));
  app.save(sets);

  const objects = app.findCollectionByNameOrId("objects");
  objects.fields.add(new TextField({ name: "name_sv", required: false, maxLength: 200 }));
  objects.fields.add(new EditorField({ name: "description_en", required: false }));
  objects.fields.add(new EditorField({ name: "description_sv", required: false }));
  objects.fields.add(new FileField({ name: "audio_en", required: false, maxSelect: 1, maxSize: 52428800, mimeTypes: ["audio/mpeg", "audio/mp3", "audio/ogg"] }));
  objects.fields.add(new FileField({ name: "audio_sv", required: false, maxSelect: 1, maxSize: 52428800, mimeTypes: ["audio/mpeg", "audio/mp3", "audio/ogg"] }));
  objects.fields.add(new FileField({ name: "subtitles_en", required: false, maxSelect: 1, maxSize: 1048576, mimeTypes: ["text/vtt", "text/plain"] }));
  objects.fields.add(new FileField({ name: "subtitles_sv", required: false, maxSelect: 1, maxSize: 1048576, mimeTypes: ["text/vtt", "text/plain"] }));
  const defaultLang = objects.fields.getByName("default_language");
  if (defaultLang) {
    defaultLang.values = ["en", "sv"];
    defaultLang.required = true;
  }
  app.save(objects);

  const images = app.findCollectionByNameOrId("object_images");
  images.fields.add(new TextField({ name: "caption_en", required: false, maxLength: 500 }));
  images.fields.add(new TextField({ name: "caption_sv", required: false, maxLength: 500 }));
  app.save(images);
});
