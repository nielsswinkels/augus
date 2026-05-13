migrate((app) => {
  const sets = app.findCollectionByNameOrId("sets");
  const floors = app.findCollectionByNameOrId("floors");

  // Save current values before removing the field
  const allSets = app.findAllRecords("sets");
  const savedValues = {};
  for (const s of allSets) {
    savedValues[s.id] = s.get("default_floor") || "";
  }

  // Remove old text field
  try {
    const old = sets.fields.getByName("default_floor");
    if (old) sets.fields.remove(old.id);
    app.save(sets);
  } catch (e) {}

  // Add as relation field
  sets.fields.add(new RelationField({
    name: "default_floor",
    required: false,
    collectionId: floors.id,
    maxSelect: 1,
  }));
  app.save(sets);

  // Restore values
  for (const s of allSets) {
    const val = savedValues[s.id];
    if (val) {
      s.set("default_floor", val);
      app.save(s);
    }
  }

}, (app) => {
  const sets = app.findCollectionByNameOrId("sets");

  const allSets = app.findAllRecords("sets");
  const savedValues = {};
  for (const s of allSets) {
    savedValues[s.id] = s.get("default_floor") || "";
  }

  try {
    const old = sets.fields.getByName("default_floor");
    if (old) sets.fields.remove(old.id);
    app.save(sets);
  } catch (e) {}

  sets.fields.add(new TextField({
    name: "default_floor",
    required: false,
  }));
  app.save(sets);

  for (const s of allSets) {
    const val = savedValues[s.id];
    if (val) {
      s.set("default_floor", val);
      app.save(s);
    }
  }
});
