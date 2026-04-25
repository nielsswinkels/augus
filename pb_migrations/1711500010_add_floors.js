migrate((app) => {
  // Create floors collection
  const floors = new Collection({
    name: "floors",
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
        collectionId: app.findCollectionByNameOrId("sets").id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        name: "label",
        type: "text",
        required: true,
        maxLength: 10,
      },
      {
        name: "name_en",
        type: "text",
        required: false,
        maxLength: 100,
      },
      {
        name: "name_sv",
        type: "text",
        required: false,
        maxLength: 100,
      },
      {
        name: "sort_order",
        type: "number",
        required: true,
        min: 0,
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
      'CREATE INDEX idx_floors_set_order ON floors ("set", sort_order)',
    ],
  });
  app.save(floors);

  // Add floor relation to objects
  const objects = app.findCollectionByNameOrId("objects");
  objects.fields.add(new RelationField({
    name: "floor",
    required: false,
    collectionId: floors.id,
    maxSelect: 1,
  }));
  app.save(objects);

  // Add default_floor to sets
  const sets = app.findCollectionByNameOrId("sets");
  sets.fields.add(new TextField({
    name: "default_floor",
    required: false,
  }));
  app.save(sets);
}, (app) => {
  const sets = app.findCollectionByNameOrId("sets");
  const df = sets.fields.getByName("default_floor");
  if (df) sets.fields.remove(df.id);
  app.save(sets);

  const objects = app.findCollectionByNameOrId("objects");
  const f = objects.fields.getByName("floor");
  if (f) objects.fields.remove(f.id);
  app.save(objects);

  const floors = app.findCollectionByNameOrId("floors");
  app.delete(floors);
});
