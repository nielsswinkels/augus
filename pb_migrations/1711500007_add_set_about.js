migrate((app) => {
  const collection = app.findCollectionByNameOrId("sets");

  collection.fields.add(new EditorField({
    name: "about_en",
    required: false,
  }));

  collection.fields.add(new EditorField({
    name: "about_sv",
    required: false,
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("sets");
  const aboutEn = collection.fields.getByName("about_en");
  const aboutSv = collection.fields.getByName("about_sv");
  if (aboutEn) collection.fields.removeById(aboutEn.id);
  if (aboutSv) collection.fields.removeById(aboutSv.id);
  app.save(collection);
});
