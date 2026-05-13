migrate((app) => {
  // Color fields: add maxLength and pattern
  const sets = app.findCollectionByNameOrId("sets");
  const colorPrimary = sets.fields.getByName("color_primary");
  if (colorPrimary) {
    colorPrimary.maxLength = 7;
    colorPrimary.pattern = "^#[0-9a-fA-F]{6}$";
  }
  const colorAccent = sets.fields.getByName("color_accent");
  if (colorAccent) {
    colorAccent.maxLength = 7;
    colorAccent.pattern = "^#[0-9a-fA-F]{6}$";
  }
  // Subtitle font: add maxLength
  const subtitleFont = sets.fields.getByName("subtitle_font");
  if (subtitleFont) subtitleFont.maxLength = 200;
  app.save(sets);

  // Lat/lng: add min/max bounds
  const objects = app.findCollectionByNameOrId("objects");
  const lat = objects.fields.getByName("latitude");
  if (lat) { lat.min = -90; lat.max = 90; }
  const lng = objects.fields.getByName("longitude");
  if (lng) { lng.min = -180; lng.max = 180; }
  app.save(objects);

  // Floor center coords: add min/max bounds
  const floors = app.findCollectionByNameOrId("floors");
  const centerLat = floors.fields.getByName("center_lat");
  if (centerLat) { centerLat.min = -90; centerLat.max = 90; }
  const centerLng = floors.fields.getByName("center_lng");
  if (centerLng) { centerLng.min = -180; centerLng.max = 180; }
  app.save(floors);

}, (app) => {
  const sets = app.findCollectionByNameOrId("sets");
  const colorPrimary = sets.fields.getByName("color_primary");
  if (colorPrimary) { colorPrimary.maxLength = 0; colorPrimary.pattern = ""; }
  const colorAccent = sets.fields.getByName("color_accent");
  if (colorAccent) { colorAccent.maxLength = 0; colorAccent.pattern = ""; }
  const subtitleFont = sets.fields.getByName("subtitle_font");
  if (subtitleFont) subtitleFont.maxLength = 0;
  app.save(sets);

  const objects = app.findCollectionByNameOrId("objects");
  const lat = objects.fields.getByName("latitude");
  if (lat) { lat.min = null; lat.max = null; }
  const lng = objects.fields.getByName("longitude");
  if (lng) { lng.min = null; lng.max = null; }
  app.save(objects);

  const floors = app.findCollectionByNameOrId("floors");
  const centerLat = floors.fields.getByName("center_lat");
  if (centerLat) { centerLat.min = null; centerLat.max = null; }
  const centerLng = floors.fields.getByName("center_lng");
  if (centerLng) { centerLng.min = null; centerLng.max = null; }
  app.save(floors);
});
