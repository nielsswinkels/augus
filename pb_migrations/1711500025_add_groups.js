migrate((app) => {
  const sets = app.findCollectionByNameOrId("sets");
  const objects = app.findCollectionByNameOrId("objects");

  // ========== GROUPS collection ==========
  const groups = new Collection({
    name: "groups",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [
      {
        name: "set",
        type: "relation",
        required: true,
        collectionId: sets.id,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        name: "sort_order",
        type: "number",
        required: true,
        min: 0,
      },
      {
        name: "color",
        type: "text",
        required: false,
        maxLength: 7,
        pattern: "^#[0-9a-fA-F]{6}$",
      },
    ],
    indexes: [
      'CREATE INDEX idx_groups_set_order ON groups ("set", sort_order)',
    ],
  });
  app.save(groups);

  // ========== GROUP_CONTENT collection ==========
  const groupContent = new Collection({
    name: "group_content",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [
      {
        name: "group",
        type: "relation",
        required: true,
        collectionId: groups.id,
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
        name: "title",
        type: "text",
        required: false,
        maxLength: 200,
      },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_group_content_lang ON group_content ("group", language)',
    ],
  });
  app.save(groupContent);

  // Add nullable group relation to objects
  objects.fields.add(new RelationField({
    name: "group",
    required: false,
    collectionId: groups.id,
    maxSelect: 1,
  }));
  app.save(objects);

}, (app) => {
  const objects = app.findCollectionByNameOrId("objects");
  const f = objects.fields.getByName("group");
  if (f) objects.fields.removeById(f.id);
  app.save(objects);

  const groupContent = app.findCollectionByNameOrId("group_content");
  app.delete(groupContent);
  const groups = app.findCollectionByNameOrId("groups");
  app.delete(groups);
});
