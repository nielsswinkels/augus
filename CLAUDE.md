# CLAUDE.md

## Cache Busting

After modifying any JS or CSS file, update the cache-busting version query strings in the HTML files that reference them:

- `pb_public/index.html` — `style.css?v=...` and `app.js?v=...`
- `pb_public/admin/index.html` — `admin.css?v=...` and `admin.js?v=...`

Use today's date + a letter suffix, e.g. `v=20260507a`. Increment the letter if making multiple changes on the same day.
