migrate((app) => {
  // Add outdoor map fields to floors
  const floors = app.findCollectionByNameOrId("floors");

  floors.fields.add(new SelectField({
    name: "type",
    required: false,
    values: ["indoor", "outdoor"],
  }));

  floors.fields.add(new NumberField({
    name: "center_lat",
    required: false,
  }));

  floors.fields.add(new NumberField({
    name: "center_lng",
    required: false,
  }));

  floors.fields.add(new NumberField({
    name: "zoom_level",
    required: false,
    min: 1,
    max: 20,
  }));

  app.save(floors);

  // Add GPS fields to objects
  const objects = app.findCollectionByNameOrId("objects");

  objects.fields.add(new NumberField({
    name: "latitude",
    required: false,
  }));

  objects.fields.add(new NumberField({
    name: "longitude",
    required: false,
  }));

  objects.fields.add(new NumberField({
    name: "trigger_radius",
    required: false,
    min: 1,
    max: 500,
  }));

  app.save(objects);
}, (app) => {
  const floors = app.findCollectionByNameOrId("floors");
  ["type", "center_lat", "center_lng", "zoom_level"].forEach(name => {
    const f = floors.fields.getByName(name);
    if (f) floors.fields.remove(f.id);
  });
  app.save(floors);

  const objects = app.findCollectionByNameOrId("objects");
  ["latitude", "longitude", "trigger_radius"].forEach(name => {
    const f = objects.fields.getByName(name);
    if (f) objects.fields.remove(f.id);
  });
  app.save(objects);
});
