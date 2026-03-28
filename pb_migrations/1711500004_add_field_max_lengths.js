migrate((app) => {
  // Add maxLength constraints to text fields for security

  const sets = app.findCollectionByNameOrId("sets");
  const setsSlug = sets.fields.getByName("slug");
  if (setsSlug) { setsSlug.maxLength = 60; }
  const setsNameEn = sets.fields.getByName("name_en");
  if (setsNameEn) { setsNameEn.maxLength = 200; }
  const setsNameSv = sets.fields.getByName("name_sv");
  if (setsNameSv) { setsNameSv.maxLength = 200; }
  app.save(sets);

  const objects = app.findCollectionByNameOrId("objects");
  const objSlug = objects.fields.getByName("slug");
  if (objSlug) { objSlug.maxLength = 60; }
  const objNameEn = objects.fields.getByName("name_en");
  if (objNameEn) { objNameEn.maxLength = 200; }
  const objNameSv = objects.fields.getByName("name_sv");
  if (objNameSv) { objNameSv.maxLength = 200; }
  app.save(objects);

  const images = app.findCollectionByNameOrId("object_images");
  const capEn = images.fields.getByName("caption_en");
  if (capEn) { capEn.maxLength = 500; }
  const capSv = images.fields.getByName("caption_sv");
  if (capSv) { capSv.maxLength = 500; }
  app.save(images);
}, (app) => {
  // Down: remove maxLength constraints (set back to 0 = unlimited)
  const sets = app.findCollectionByNameOrId("sets");
  ["slug", "name_en", "name_sv"].forEach(name => {
    const f = sets.fields.getByName(name);
    if (f) f.maxLength = 0;
  });
  app.save(sets);

  const objects = app.findCollectionByNameOrId("objects");
  ["slug", "name_en", "name_sv"].forEach(name => {
    const f = objects.fields.getByName(name);
    if (f) f.maxLength = 0;
  });
  app.save(objects);

  const images = app.findCollectionByNameOrId("object_images");
  ["caption_en", "caption_sv"].forEach(name => {
    const f = images.fields.getByName(name);
    if (f) f.maxLength = 0;
  });
  app.save(images);
});
