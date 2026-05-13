migrate((app) => {
  const sets = app.findCollectionByNameOrId("sets");
  const objects = app.findCollectionByNameOrId("objects");
  const objectImages = app.findCollectionByNameOrId("object_images");

  // ========== SET_CONTENT collection ==========
  const setContent = new Collection({
    name: "set_content",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [
      {
        name: "set",
        type: "relation",
        required: true,
        collectionId: sets.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        name: "language",
        type: "text",
        required: true,
        maxLength: 10,
      },
      {
        name: "name",
        type: "text",
        required: false,
        maxLength: 200,
      },
      {
        name: "description",
        type: "editor",
        required: false,
      },
      {
        name: "about",
        type: "editor",
        required: false,
      },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_set_content_lang ON set_content ("set", language)',
    ],
  });
  app.save(setContent);

  // ========== OBJECT_CONTENT collection ==========
  const objectContent = new Collection({
    name: "object_content",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [
      {
        name: "object",
        type: "relation",
        required: true,
        collectionId: objects.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        name: "language",
        type: "text",
        required: true,
        maxLength: 10,
      },
      {
        name: "name",
        type: "text",
        required: false,
        maxLength: 200,
      },
      {
        name: "description",
        type: "editor",
        required: false,
      },
      {
        name: "audio",
        type: "file",
        required: false,
        maxSelect: 1,
        maxSize: 52428800,
        mimeTypes: ["audio/mpeg", "audio/mp3", "audio/ogg"],
      },
      {
        name: "subtitles",
        type: "file",
        required: false,
        maxSelect: 1,
        maxSize: 1048576,
        mimeTypes: ["text/vtt", "text/plain"],
      },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_object_content_lang ON object_content (object, language)',
    ],
  });
  app.save(objectContent);

  // ========== IMAGE_CONTENT collection ==========
  const imageContent = new Collection({
    name: "image_content",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [
      {
        name: "image",
        type: "relation",
        required: true,
        collectionId: objectImages.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        name: "language",
        type: "text",
        required: true,
        maxLength: 10,
      },
      {
        name: "caption",
        type: "text",
        required: false,
        maxLength: 500,
      },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_image_content_lang ON image_content (image, language)',
    ],
  });
  app.save(imageContent);

  // ========== Add available_languages to sets ==========
  sets.fields.add(new JSONField({
    name: "available_languages",
    required: false,
  }));
  app.save(sets);

}, (app) => {
  // Revert: remove available_languages from sets
  const sets = app.findCollectionByNameOrId("sets");
  const f = sets.fields.getByName("available_languages");
  if (f) sets.fields.removeById(f.id);
  app.save(sets);

  // Delete content collections
  const imageContent = app.findCollectionByNameOrId("image_content");
  app.delete(imageContent);
  const objectContent = app.findCollectionByNameOrId("object_content");
  app.delete(objectContent);
  const setContent = app.findCollectionByNameOrId("set_content");
  app.delete(setContent);
});
