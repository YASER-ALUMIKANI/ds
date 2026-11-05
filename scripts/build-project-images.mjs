#!/usr/bin/env node
/**
 * Optimises project photos for GitHub Pages.
 *
 * Input : source-images/<project-slug>/**.(jpg|jpeg|png|webp|tif|tiff)  (git-ignored, keep originals here)
 * Output: assets/projects/<project-slug>/<name>-<width>.webp           (400 / 900 / 1800 px wide)
 *         data/gallery-manifest.json                                    (sizes of every image, for <img width/height>)
 *
 * The cover image is the file named "cover.*" if present, otherwise the first file alphabetically.
 * EXIF/GPS metadata is stripped, orientation is applied, images are never upscaled.
 * Already-converted images are skipped unless the source file is newer.
 *
 * Usage: npm run images [-- <project-slug>]
 */
import { readdir, mkdir, stat, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = path.join(ROOT, 'source-images');
const OUTPUT_DIR = path.join(ROOT, 'assets', 'projects');
const MANIFEST_PATH = path.join(ROOT, 'data', 'gallery-manifest.json');

const WIDTHS = [400, 900, 1800];
const QUALITY = 78;
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff']);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function isFresh(source, outputs) {
  if (!outputs.every(existsSync)) return false;
  const sourceTime = (await stat(source)).mtimeMs;
  const times = await Promise.all(outputs.map(async file => (await stat(file)).mtimeMs));
  return times.every(time => time >= sourceTime);
}

async function convertImage(sourceFile, projectOut, name) {
  const outputs = WIDTHS.map(width => path.join(projectOut, `${name}-${width}.webp`));
  const image = sharp(sourceFile, { failOn: 'none' }).rotate();
  const meta = await sharp(sourceFile, { failOn: 'none' }).metadata();
  // EXIF orientations 5-8 swap width and height once the image is auto-rotated.
  const swapped = meta.orientation >= 5;
  const rawWidth = swapped ? meta.height : meta.width;
  const rawHeight = swapped ? meta.width : meta.height;

  if (!(await isFresh(sourceFile, outputs))) {
    for (const [index, width] of WIDTHS.entries()) {
      await image
        .clone()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 5 })
        .toFile(outputs[index]);
    }
  }

  return { name, width: rawWidth, height: rawHeight };
}

async function processProject(folderName, slug) {
  const projectSource = path.join(SOURCE_DIR, folderName);
  const projectOut = path.join(OUTPUT_DIR, slug);
  await mkdir(projectOut, { recursive: true });

  // Photos may sit directly in the project folder or in sub-folders; both are included.
  const files = (await readdir(projectSource, { recursive: true }))
    .filter(file => EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  if (!files.length) return null;

  const coverFile = files.find(file => path.parse(file).name.toLowerCase() === 'cover') || files[0];
  const used = new Set();
  const images = [];
  let cover = null;

  for (const file of files) {
    // Names without Latin letters/digits (e.g. Arabic) get a stable hash-based name.
    const fallback = `photo-${createHash('sha1').update(file).digest('hex').slice(0, 8)}`;
    let name = slugify(path.parse(file).name) || fallback;
    while (used.has(name)) name += '-x';
    used.add(name);
    try {
      const entry = await convertImage(path.join(projectSource, file), projectOut, name);
      images.push(entry);
      if (file === coverFile) cover = entry.name;
    } catch (error) {
      console.warn(`  ! skipped ${slug}/${file}: ${error.message}`);
    }
  }

  return { cover: cover || images[0]?.name || null, widths: WIDTHS, images };
}

async function directorySize(dir) {
  let total = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? await directorySize(full) : (await stat(full)).size;
  }
  return total;
}

async function main() {
  if (!existsSync(SOURCE_DIR)) {
    await mkdir(SOURCE_DIR, { recursive: true });
    console.log('Created source-images/. Add one folder per project (e.g. source-images/riyadh-mall-atrium/) and run again.');
    return;
  }

  const requested = process.argv[2] ? slugify(process.argv[2]) : null;
  const folders = (await readdir(SOURCE_DIR, { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  let manifest = {};
  if (existsSync(MANIFEST_PATH)) manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));

  for (const folderName of folders) {
    const slug = slugify(folderName);
    if (!slug || !SLUG_PATTERN.test(slug)) {
      console.warn(`! "${folderName}" could not be converted to a valid slug. Skipped.`);
      continue;
    }
    if (requested && slug !== requested && folderName !== process.argv[2]) continue;
    console.log(`Processing ${folderName} -> ${slug} ...`);
    const result = await processProject(folderName, slug);
    if (result) {
      manifest[slug] = result;
      console.log(`  ${result.images.length} images, cover: ${result.cover}`);
    }
  }

  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(MANIFEST_PATH, `${JSON.stringify(sorted, null, 2)}\n`);

  if (existsSync(OUTPUT_DIR)) {
    const megabytes = (await directorySize(OUTPUT_DIR)) / 1024 / 1024;
    console.log(`\nassets/projects total: ${megabytes.toFixed(1)} MB (keep the site under ~300 MB for GitHub Pages).`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
