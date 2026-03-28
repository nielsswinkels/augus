migrate((app) => {
  const collection = app.findCollectionByNameOrId("sets");

  collection.fields.add(new BoolField({
    name: "published",
    required: false,
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("sets");
  const field = collection.fields.getByName("published");
  if (field) collection.fields.remove(field.id);
  app.save(collection);
});
