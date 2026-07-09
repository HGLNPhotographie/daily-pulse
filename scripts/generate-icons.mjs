import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = join(root, "assets");
const iconsDir = join(root, "public", "icons");
const appDir = join(root, "src", "app");

const logo = readFileSync(join(assetsDir, "logo.svg"));
const logoMaskable = readFileSync(join(assetsDir, "logo-maskable.svg"));
const logoSplash = readFileSync(join(assetsDir, "logo-splash.svg"));

async function writePng(svg, path, size) {
  await sharp(svg).resize(size, size).png({ compressionLevel: 9 }).toFile(path);
  console.log(`✓ ${path} (${size}px)`);
}

/** Construit un .ico multi-tailles à partir de buffers PNG (format PNG embarqué). */
function createIco(pngBySize) {
  const images = pngBySize.map(({ size, buffer }) => ({ size, buffer }));
  const headerSize = 6;
  const dirSize = 16 * images.length;
  let offset = headerSize + dirSize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(dirSize);
  const chunks = [header, directory];

  images.forEach(({ size, buffer }, index) => {
    const entryOffset = index * 16;
    const dim = size >= 256 ? 0 : size;
    directory.writeUInt8(dim, entryOffset);
    directory.writeUInt8(dim, entryOffset + 1);
    directory.writeUInt8(0, entryOffset + 2);
    directory.writeUInt8(0, entryOffset + 3);
    directory.writeUInt16LE(1, entryOffset + 4);
    directory.writeUInt16LE(32, entryOffset + 6);
    directory.writeUInt32LE(buffer.length, entryOffset + 8);
    directory.writeUInt32LE(offset, entryOffset + 12);
    chunks.push(buffer);
    offset += buffer.length;
  });

  return Buffer.concat(chunks);
}

async function writeFavicon(svg, path) {
  const sizes = [16, 32, 48];
  const pngBySize = await Promise.all(
    sizes.map(async (size) => ({
      size,
      buffer: await sharp(svg).resize(size, size).png({ compressionLevel: 9 }).toBuffer(),
    }))
  );
  writeFileSync(path, createIco(pngBySize));
  console.log(`✓ ${path} (${sizes.join(", ")}px)`);
}

const iconSizes = [48, 72, 96, 128, 192, 256, 512];

for (const size of iconSizes) {
  await writePng(logo, join(iconsDir, `icon-${size}.png`), size);
}

await writePng(logoMaskable, join(iconsDir, "icon-512-maskable.png"), 512);
await writePng(logo, join(assetsDir, "icon.png"), 1024);
await writePng(logo, join(appDir, "icon.png"), 512);
await writePng(logo, join(appDir, "apple-icon.png"), 180);
await writeFavicon(logo, join(appDir, "favicon.ico"));

for (const name of ["splash.png", "splash-dark.png", "splash-square.png"]) {
  await writePng(logoSplash, join(assetsDir, name), 2732);
}

console.log("Icônes générées.");
