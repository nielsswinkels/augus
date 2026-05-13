migrate((app) => {
  const images = app.findCollectionByNameOrId("object_images");

  images.fields.add(new SelectField({
    name: "media_type",
    required: false,
    values: ["image", "360", "3d"],
    maxSelect: 1,
  }));

  images.fields.add(new FileField({
    name: "model_file",
    required: false,
    maxSelect: 1,
    maxSize: 52428800,
    mimeTypes: ["model/gltf-binary", "model/gltf+json", "application/octet-stream"],
  }));

  // Make image field optional (3D models may not have a poster image)
  const imageField = images.fields.getByName("image");
  if (imageField) imageField.required = false;

  app.save(images);

  // Migrate is_360 to media_type
  const allImages = app.findAllRecords("object_images");
  for (const img of allImages) {
    if (img.get("is_360")) {
      img.set("media_type", "360");
    } else {
      img.set("media_type", "image");
    }
    app.save(img);
  }

  // Remove is_360 field
  try {
    const f = images.fields.getByName("is_360");
    if (f) images.fields.removeById(f.id);
    app.save(images);
  } catch (e) { /* PB version compat */ }

}, (app) => {
  const images = app.findCollectionByNameOrId("object_images");

  images.fields.add(new BoolField({
    name: "is_360",
    required: false,
  }));

  // Migrate media_type back to is_360
  try {
    const allImages = app.findAllRecords("object_images");
    for (const img of allImages) {
      if (img.get("media_type") === "360") {
        img.set("is_360", true);
      }
      app.save(img);
    }
  } catch (e) {}

  try {
    const mt = images.fields.getByName("media_type");
    if (mt) images.fields.removeById(mt.id);
    const mf = images.fields.getByName("model_file");
    if (mf) images.fields.removeById(mf.id);
    app.save(images);
  } catch (e) {}
});
