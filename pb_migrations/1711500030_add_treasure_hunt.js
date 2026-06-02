migrate((app) => {
  const sets = app.findCollectionByNameOrId("sets");
  sets.fields.add(new BoolField({
    name: "treasure_hunt",
    required: false,
  }));
  app.save(sets);
}, (app) => {
  const sets = app.findCollectionByNameOrId("sets");
  sets.fields.removeById(sets.fields.getByName("treasure_hunt").id);
  app.save(sets);
});
