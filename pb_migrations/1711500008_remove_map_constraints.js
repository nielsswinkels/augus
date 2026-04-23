migrate((app) => {
  const collection = app.findCollectionByNameOrId("objects");

  const mapX = collection.fields.getByName("map_x");
  if (mapX) {
    mapX.min = null;
    mapX.max = null;
  }

  const mapY = collection.fields.getByName("map_y");
  if (mapY) {
    mapY.min = null;
    mapY.max = null;
  }

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("objects");

  const mapX = collection.fields.getByName("map_x");
  if (mapX) {
    mapX.min = 0;
    mapX.max = 100;
  }

  const mapY = collection.fields.getByName("map_y");
  if (mapY) {
    mapY.min = 0;
    mapY.max = 100;
  }

  app.save(collection);
});
