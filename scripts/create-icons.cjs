const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
async function main() {
  const { default: pngToIco } = await import("png-to-ico");
  const root = path.resolve(__dirname, "..");
  const dir = path.join(root, "build");
  fs.mkdirSync(dir, { recursive: true });
  const small = await sharp(path.join(root, "public/pixel-memo.svg"))
    .resize(32, 32)
    .png()
    .toBuffer();
  const paths = [];
  for (const size of [16, 32, 48, 64, 128, 256]) {
    const p = path.join(dir, `icon-${size}.png`);
    await sharp(small)
      .resize(size, size, { kernel: "nearest" })
      .png()
      .toFile(p);
    paths.push(p);
  }
  fs.writeFileSync(path.join(dir, "icon.ico"), await pngToIco(paths));
  fs.copyFileSync(
    path.join(dir, "icon-256.png"),
    path.join(root, "public/icon.png"),
  );
  console.log("Pixel app icon generated in PNG and multi-size ICO formats");
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
