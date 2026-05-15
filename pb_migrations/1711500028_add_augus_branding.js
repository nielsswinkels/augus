migrate((app) => {
  const sets = app.findCollectionByNameOrId("sets");
  sets.fields.add(new BoolField({
    name: "show_augus_branding",
    required: false,
  }));
  app.save(sets);

  const allSets = app.findAllRecords("sets");
  for (const s of allSets) {
    s.set("show_augus_branding", true);
    app.save(s);
  }
}, (app) => {
  const sets = app.findCollectionByNameOrId("sets");
  sets.fields.removeById(sets.fields.getByName("show_augus_branding").id);
  app.save(sets);
});
