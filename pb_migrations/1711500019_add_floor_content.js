migrate((app) => {
  const floors = app.findCollectionByNameOrId("floors");

  const floorContent = new Collection({
    name: "floor_content",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [
      {
        name: "floor",
        type: "relation",
        required: true,
        collectionId: floors.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        name: "language",
        type: "text",
        required: true,
        maxLength: 10,
      },
      {
        name: "label",
        type: "text",
        required: false,
        maxLength: 10,
      },
      {
        name: "name",
        type: "text",
        required: false,
        maxLength: 100,
      },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_floor_content_lang ON floor_content (floor, language)',
    ],
  });
  app.save(floorContent);

  // Migrate existing floor data
  const allFloors = app.findAllRecords("floors");
  for (const f of allFloors) {
    if (f.get("label") || f.get("name_en")) {
      const en = new Record(floorContent);
      en.set("floor", f.id);
      en.set("language", "en");
      en.set("label", f.get("label") || "");
      en.set("name", f.get("name_en") || "");
      app.save(en);
    }
    if (f.get("name_sv")) {
      const sv = new Record(floorContent);
      sv.set("floor", f.id);
      sv.set("language", "sv");
      sv.set("label", f.get("label") || "");
      sv.set("name", f.get("name_sv") || "");
      app.save(sv);
    }
  }

  // Remove old name_en, name_sv from floors (keep label as fallback)
  try {
    const nameEn = floors.fields.getByName("name_en");
    if (nameEn) floors.fields.remove(nameEn.id);
    const nameSv = floors.fields.getByName("name_sv");
    if (nameSv) floors.fields.remove(nameSv.id);
    app.save(floors);
  } catch (e) { /* field removal may not work in all PB versions */ }

}, (app) => {
  // Revert
  const floors = app.findCollectionByNameOrId("floors");
  floors.fields.add(new TextField({ name: "name_en", required: false, maxLength: 100 }));
  floors.fields.add(new TextField({ name: "name_sv", required: false, maxLength: 100 }));
  app.save(floors);

  try {
    const floorContent = app.findCollectionByNameOrId("floor_content");
    app.delete(floorContent);
  } catch (e) {}
});
