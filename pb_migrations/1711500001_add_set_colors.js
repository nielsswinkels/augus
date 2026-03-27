migrate((app) => {
  const collection = app.findCollectionByNameOrId("sets");

  collection.fields.add(new TextField({
    name: "color_primary",
    required: false,
  }));

  collection.fields.add(new TextField({
    name: "color_accent",
    required: false,
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("sets");
  const primary = collection.fields.getByName("color_primary");
  const accent = collection.fields.getByName("color_accent");
  if (primary) collection.fields.remove(primary.id);
  if (accent) collection.fields.remove(accent.id);
  app.save(collection);
});
