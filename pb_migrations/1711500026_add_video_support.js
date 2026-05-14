migrate((app) => {
  const objectImages = app.findCollectionByNameOrId("object_images");

  // Add video_file field
  objectImages.fields.add(new FileField({
    name: "video_file",
    required: false,
    maxSelect: 1,
    maxSize: 524288000,
    mimeTypes: ["video/mp4", "video/webm"],
  }));

  // Update media_type to include "video"
  const mediaType = objectImages.fields.getByName("media_type");
  if (mediaType) {
    mediaType.values = ["image", "360", "3d", "video"];
  }
  app.save(objectImages);

  // Create video_subtitles collection
  const videoSubs = new Collection({
    name: "video_subtitles",
    type: "base",
    listRule: "",
    viewRule: "",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
    fields: [
      {
        name: "media",
        type: "relation",
        required: true,
        collectionId: objectImages.id,
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
        name: "subtitles",
        type: "file",
        required: true,
        maxSelect: 1,
        maxSize: 1048576,
        mimeTypes: ["text/vtt", "text/plain"],
      },
    ],
    indexes: [
      'CREATE UNIQUE INDEX idx_video_subs_lang ON video_subtitles (media, language)',
    ],
  });
  app.save(videoSubs);

}, (app) => {
  const videoSubs = app.findCollectionByNameOrId("video_subtitles");
  app.delete(videoSubs);

  const objectImages = app.findCollectionByNameOrId("object_images");
  const mediaType = objectImages.fields.getByName("media_type");
  if (mediaType) {
    mediaType.values = ["image", "360", "3d"];
  }
  const vf = objectImages.fields.getByName("video_file");
  if (vf) objectImages.fields.removeById(vf.id);
  app.save(objectImages);
});
