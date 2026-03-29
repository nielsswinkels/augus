migrate((app) => {
  const collection = app.findCollectionByNameOrId("sets");
  collection.fields.add(new FileField({
    name: "custom_font",
    required: false,
    maxSelect: 1,
    maxSize: 5242880,
    mimeTypes: ["font/woff2", "font/woff", "font/ttf", "font/otf", "application/font-woff", "application/font-woff2", "application/x-font-ttf", "application/vnd.ms-opentype"],
  }));
  collection.fields.add(new TextField({
    name: "subtitle_font",
    required: false,
  }));
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("sets");
  ["custom_font", "subtitle_font"].forEach(name => {
    const f = collection.fields.getByName(name);
    if (f) collection.fields.remove(f.id);
  });
  app.save(collection);
});
