migrate((app) => {
  const images = app.findCollectionByNameOrId("object_images");
  const field = images.fields.getByName("image");
  field.maxSize = 26214400;
  app.save(images);
}, (app) => {
  const images = app.findCollectionByNameOrId("object_images");
  const field = images.fields.getByName("image");
  field.maxSize = 10485760;
  app.save(images);
});
