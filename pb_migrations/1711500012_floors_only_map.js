migrate((app) => {
  // Migrate existing set.map_image to a floor record
  // This is a data migration — for each set that has a map_image but no floors,
  // create a floor record with that map image.
  // Note: PocketBase file fields can't be directly copied between collections
  // via JS migrations. This migration is a no-op — the admin auto-creates
  // a floor when you open a set that has no floors. Existing map_image data
  // on sets is preserved but no longer used by the visitor app.
}, (app) => {
  // No revert needed
});
