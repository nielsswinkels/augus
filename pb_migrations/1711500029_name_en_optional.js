migrate((app) => {
  const sets = app.findCollectionByNameOrId("sets");
  const nameEn = sets.fields.getByName("name_en");
  if (nameEn) nameEn.required = false;
  app.save(sets);
}, (app) => {
  const sets = app.findCollectionByNameOrId("sets");
  const nameEn = sets.fields.getByName("name_en");
  if (nameEn) nameEn.required = true;
  app.save(sets);
});
