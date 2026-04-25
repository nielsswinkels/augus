migrate((app) => {
  const collection = app.findCollectionByNameOrId("objects");

  collection.fields.add(new BoolField({
    name: "published",
    required: false,
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("objects");
  const field = collection.fields.getByName("published");
  if (field) collection.fields.remove(field.id);
  app.save(collection);
});
