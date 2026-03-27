/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // ========== SETS collection ==========
  const sets = new Collection({
    name: "sets",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [
      {
        name: "slug",
        type: "text",
        required: true,
        pattern: "^[a-z0-9-]+$",
      },
      {
        name: "name_en",
        type: "text",
        required: true,
      },
      {
        name: "name_sv",
        type: "text",
        required: false,
      },
      {
        name: "description_en",
        type: "editor",
        required: false,
      },
      {
        name: "description_sv",
        type: "editor",
        required: false,
      },
      {
        name: "map_image",
        type: "file",
        required: false,
        maxSelect: 1,
        maxSize: 10485760,
        mimeTypes: ["image/png", "image/jpeg", "image/webp"],
      },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_sets_slug ON sets (slug)",
    ],
  });
  app.save(sets);

  // ========== OBJECTS collection ==========
  const objects = new Collection({
    name: "objects",
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
        name: "slug",
        type: "text",
        required: true,
        pattern: "^[a-z0-9-]+$",
      },
      {
        name: "sort_order",
        type: "number",
        required: true,
        min: 0,
      },
      {
        name: "name_en",
        type: "text",
        required: true,
      },
      {
        name: "name_sv",
        type: "text",
        required: false,
      },
      {
        name: "description_en",
        type: "editor",
        required: false,
      },
      {
        name: "description_sv",
        type: "editor",
        required: false,
      },
      {
        name: "default_language",
        type: "select",
        required: true,
        values: ["en", "sv"],
        maxSelect: 1,
      },
      {
        name: "audio_en",
        type: "file",
        required: false,
        maxSelect: 1,
        maxSize: 52428800,
        mimeTypes: ["audio/mpeg", "audio/mp3", "audio/ogg"],
      },
      {
        name: "audio_sv",
        type: "file",
        required: false,
        maxSelect: 1,
        maxSize: 52428800,
        mimeTypes: ["audio/mpeg", "audio/mp3", "audio/ogg"],
      },
      {
        name: "subtitles_en",
        type: "file",
        required: false,
        maxSelect: 1,
        maxSize: 1048576,
        mimeTypes: ["text/vtt", "text/plain"],
      },
      {
        name: "subtitles_sv",
        type: "file",
        required: false,
        maxSelect: 1,
        maxSize: 1048576,
        mimeTypes: ["text/vtt", "text/plain"],
      },
      {
        name: "map_x",
        type: "number",
        required: false,
        min: 0,
        max: 100,
      },
      {
        name: "map_y",
        type: "number",
        required: false,
        min: 0,
        max: 100,
      },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_objects_set_slug ON objects (\"set\", slug)",
      "CREATE INDEX idx_objects_set_order ON objects (\"set\", sort_order)",
    ],
  });
  app.save(objects);

  // ========== OBJECT_IMAGES collection ==========
  const objectImages = new Collection({
    name: "object_images",
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
        name: "image",
        type: "file",
        required: true,
        maxSelect: 1,
        maxSize: 10485760,
        mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
      },
      {
        name: "caption_en",
        type: "text",
        required: false,
      },
      {
        name: "caption_sv",
        type: "text",
        required: false,
      },
      {
        name: "sort_order",
        type: "number",
        required: true,
        min: 0,
      },
    ],
    indexes: [
      "CREATE INDEX idx_object_images_order ON object_images (object, sort_order)",
    ],
  });
  app.save(objectImages);

}, (app) => {
  // Revert
  const objectImages = app.findCollectionByNameOrId("object_images");
  app.delete(objectImages);
  const objects = app.findCollectionByNameOrId("objects");
  app.delete(objects);
  const sets = app.findCollectionByNameOrId("sets");
  app.delete(sets);
});
