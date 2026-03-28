migrate((app) => {
  const collection = app.findCollectionByNameOrId("sets");

  collection.fields.add(new BoolField({
    name: "sequential_navigation",
    required: false,
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("sets");
  const field = collection.fields.getByName("sequential_navigation");
  if (field) collection.fields.remove(field.id);
  app.save(collection);
});
