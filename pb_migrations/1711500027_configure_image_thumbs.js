migrate((app) => {
  const objectImages = app.findCollectionByNameOrId("object_images");
  const imageField = objectImages.fields.getByName("image");
  if (imageField) {
    imageField.thumbs = ["128x128", "600x400"];
  }
  app.save(objectImages);
}, (app) => {
  const objectImages = app.findCollectionByNameOrId("object_images");
  const imageField = objectImages.fields.getByName("image");
  if (imageField) {
    imageField.thumbs = [];
  }
  app.save(objectImages);
});
