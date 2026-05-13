migrate((app) => {
  const sets = app.findCollectionByNameOrId("sets");
  sets.indexes.push('CREATE INDEX idx_sets_published ON sets (published)');
  app.save(sets);

  const objects = app.findCollectionByNameOrId("objects");
  objects.indexes.push('CREATE INDEX idx_objects_published ON objects (published)');
  objects.indexes.push('CREATE INDEX idx_objects_floor ON objects (floor)');
  app.save(objects);
}, (app) => {
  const sets = app.findCollectionByNameOrId("sets");
  sets.indexes = sets.indexes.filter(i => !i.includes("idx_sets_published"));
  app.save(sets);

  const objects = app.findCollectionByNameOrId("objects");
  objects.indexes = objects.indexes.filter(i => !i.includes("idx_objects_published") && !i.includes("idx_objects_floor"));
  app.save(objects);
});
