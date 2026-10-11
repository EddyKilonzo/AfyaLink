/**
 * Renders the PNG app icons from the SVG mark in public/.
 *
 *   node scripts/generate-icons.mjs        (run from frontend/)
 *
 * Uses `sharp`, which Next.js installs as an optional dependency for image
 * optimisation; it is not a direct dependency of this project. The outputs are
 * committed, so this only needs re-running when the SVG mark changes.
 *
 * Outputs:
 *   public/icons/icon-192.png           purpose "any" (rounded tile, transparent corners)
 *   public/icons/icon-512.png           purpose "any"
 *   public/icons/icon-maskable-512.png  purpose "maskable" (full-bleed, mark inside the 80% safe zone)
 *   src/app/apple-icon.png              180x180 full-bleed; iOS rounds the corners itself
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconSvg = await readFile(path.join(root, "public/icon.svg"), "utf8");
const maskableSvg = await readFile(path.join(root, "public/icon-maskable.svg"), "utf8");
// iOS fills transparent pixels with black, so the apple icon drops the corner radius.
const fullBleedSvg = iconSvg.replace(/<rect width="32" height="32" rx="9"/, '<rect width="32" height="32"');

async function render(svg, size, outFile, flatten) {
  // A high density keeps the vector edges crisp when rasterised at 512px.
  let image = sharp(Buffer.from(svg), { density: 72 * Math.ceil(size / 32) }).resize(size, size);
  if (flatten) image = image.flatten({ background: "#0b3d35" });
  const out = path.join(root, outFile);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, await image.png({ compressionLevel: 9 }).toBuffer());
  console.log(`wrote ${outFile} (${size}x${size})`);
}

await render(iconSvg, 192, "public/icons/icon-192.png", false);
await render(iconSvg, 512, "public/icons/icon-512.png", false);
await render(maskableSvg, 512, "public/icons/icon-maskable-512.png", true);
await render(fullBleedSvg, 180, "src/app/apple-icon.png", true);
