migrate((app) => {
  const images = app.findCollectionByNameOrId("object_images");

  images.fields.add(new BoolField({
    name: "is_360",
    required: false,
  }));

  app.save(images);
}, (app) => {
  const images = app.findCollectionByNameOrId("object_images");
  const f = images.fields.getByName("is_360");
  if (f) images.fields.removeById(f.id);
  app.save(images);
});
