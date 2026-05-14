migrate((app) => {
  const sets = app.findCollectionByNameOrId("sets");
  sets.fields.add(new BoolField({
    name: "show_numbers",
    required: false,
  }));
  app.save(sets);

  // Default existing sets to true
  const allSets = app.findAllRecords("sets");
  for (const s of allSets) {
    s.set("show_numbers", true);
    app.save(s);
  }
}, (app) => {
  const sets = app.findCollectionByNameOrId("sets");
  sets.fields.removeById(sets.fields.getByName("show_numbers").id);
  app.save(sets);
});
