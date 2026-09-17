const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

const ROOT = path.resolve(__dirname, '..');
const sourcePath = path.join(ROOT, 'build', 'voyant-icon.png');
const tempDir = path.join(ROOT, 'temp-icons');
const outputPath = path.join(ROOT, 'public', 'icon.ico');

async function generateIcon() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing icon source: ${sourcePath}`);
  }

  fs.mkdirSync(tempDir, { recursive: true });
  const sizes = [16, 32, 48, 64, 128, 256];
  const tempPaths = [];

  for (const size of sizes) {
    const tempPath = path.join(tempDir, `icon-${size}.png`);
    await sharp(sourcePath)
      .resize(size, size, { fit: 'contain', background: { r: 13, g: 10, b: 27, alpha: 1 } })
      .png()
      .toFile(tempPath);
    tempPaths.push(tempPath);
  }

  const ico = await pngToIco(tempPaths);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, ico);
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log(`Wrote ${outputPath}`);
}

generateIcon().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
