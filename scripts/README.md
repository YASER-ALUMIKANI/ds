# Adding project photos

1. Create one folder per project inside `source-images/` (git-ignored — keep your originals here).
   Use lowercase English letters, digits and dashes only:

   ```
   source-images/
     riyadh-mall-atrium/
       cover.jpg        ← optional; otherwise the first file is the cover
       IMG_0001.jpg
       IMG_0002.jpg
     jeddah-3d-billboard/
       ...
   ```

2. Run `npm run images` (or `npm run images -- riyadh-mall-atrium` for a single project).

3. The script writes, for every photo, three WebP sizes (400 / 900 / 1800 px, EXIF/GPS removed) to
   `assets/projects/<project>/` and updates `data/gallery-manifest.json` with each image's dimensions.
   Re-running only converts new or changed photos.

4. Commit `assets/projects/` and `data/` — never `source-images/`.

Keep the total size of `assets/projects/` under ~300 MB (the script prints it) to stay well within GitHub Pages limits.

