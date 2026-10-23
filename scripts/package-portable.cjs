// Build the self-extracting Windows app with the official public-domain LZMA SDK.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { getPath7za } = require("app-builder-lib/out/toolsets/7zip");
const { version } = require("../package.json");
const root = path.resolve(__dirname, "..");
async function run(command, args, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)),
    );
  });
}
async function main() {
  const sevenZip = await getPath7za();
  const cache = path.join(
    process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache"),
    "memo-packaging",
  );
  fs.mkdirSync(cache, { recursive: true });
  const sdkArchive = path.join(cache, "lzma2501.7z");
  const expected =
    "cbc3babd589d971e45971d787ff100be8aaa5eab15b2694497ec3e447009e1f2";
  if (!fs.existsSync(sdkArchive)) {
    const response = await fetch(
      "https://github.com/ip7z/7zip/releases/download/25.01/lzma2501.7z",
    );
    if (!response.ok)
      throw new Error(`SDK download failed: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (crypto.createHash("sha256").update(bytes).digest("hex") !== expected)
      throw new Error("LZMA SDK checksum mismatch");
    fs.writeFileSync(sdkArchive, bytes);
  }
  if (
    crypto
      .createHash("sha256")
      .update(fs.readFileSync(sdkArchive))
      .digest("hex") !== expected
  )
    throw new Error("Cached LZMA SDK checksum mismatch");
  const sdkDir = path.join(cache, "sdk-25.01");
  await run(sevenZip, ["x", sdkArchive, `-o${sdkDir}`, "-y", "-bso0"]);
  const dir = path.join(root, "release");
  const archive = path.join(dir, `MEMO-Windows-${version}.7z`);
  const exe = path.join(dir, `MEMO-Windows-${version}.exe`);
  fs.rmSync(archive, { force: true });
  await run(
    sevenZip,
    [
      "a",
      "-t7z",
      "-m0=lzma2",
      "-mx=7",
      "-mmt=4",
      "-ms=on",
      "-bso0",
      archive,
      ".",
    ],
    path.join(dir, "win-unpacked"),
  );
  const module = fs.readFileSync(path.join(sdkDir, "bin/7zSD.sfx"));
  const config = Buffer.from(
    ';!@Install@!UTF-8!\nTitle="MEMO"\nRunProgram="MEMO.exe"\nProgress="yes"\n;!@InstallEnd@!\n',
  );
  fs.writeFileSync(
    exe,
    Buffer.concat([module, config, fs.readFileSync(archive)]),
  );
  await run(sevenZip, ["t", exe, "-bso0"]);
  const hash = crypto
    .createHash("sha256")
    .update(fs.readFileSync(exe))
    .digest("hex");
  fs.writeFileSync(`${exe}.sha256`, `${hash}  ${path.basename(exe)}\n`);
  console.log(
    `Portable Windows app: ${exe} (${(fs.statSync(exe).size / 1024 / 1024).toFixed(1)} MiB)`,
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
