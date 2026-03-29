migrate((app) => {
  const collection = app.findCollectionByNameOrId("sets");

  collection.fields.add(new FileField({
    name: "logo",
    required: false,
    maxSelect: 1,
    maxSize: 2097152,
    mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("sets");
  const field = collection.fields.getByName("logo");
  if (field) collection.fields.remove(field.id);
  app.save(collection);
});
