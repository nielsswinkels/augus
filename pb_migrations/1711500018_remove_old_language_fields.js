migrate((app) => {
  // Remove old hardcoded language fields from sets
  const sets = app.findCollectionByNameOrId("sets");
  const setFields = ["name_sv", "description_en", "description_sv", "about_en", "about_sv"];
  for (const name of setFields) {
    const f = sets.fields.getByName(name);
    if (f) sets.fields.remove(f.id);
  }
  // Keep name_en for sorting/backward compatibility (used as display fallback)
  app.save(sets);

  // Remove old hardcoded language fields from objects
  const objects = app.findCollectionByNameOrId("objects");
  const objFields = ["name_sv", "description_en", "description_sv", "audio_en", "audio_sv", "subtitles_en", "subtitles_sv"];
  for (const name of objFields) {
    const f = objects.fields.getByName(name);
    if (f) objects.fields.remove(f.id);
  }
  app.save(objects);

  // Remove old hardcoded caption fields from object_images
  const images = app.findCollectionByNameOrId("object_images");
  const imgFields = ["caption_en", "caption_sv"];
  for (const name of imgFields) {
    const f = images.fields.getByName(name);
    if (f) images.fields.remove(f.id);
  }
  app.save(images);

  // Update objects.default_language select to allow any value
  const defaultLang = objects.fields.getByName("default_language");
  if (defaultLang) {
    defaultLang.values = [];
    defaultLang.required = false;
  }
  app.save(objects);

}, (app) => {
  // Revert: re-add the old fields
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
