// Build the self-extracting Windows app with the official public-domain LZMA SDK.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { getPath7za } = require("app-builder-lib/out/toolsets/7zip");
const { withMemoIcon } = require("./patch-icons.cjs");
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
  const appExe = path.join(dir, "win-unpacked/MEMO.exe");
  fs.writeFileSync(appExe, await withMemoIcon(fs.readFileSync(appExe)));
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
  const module = await withMemoIcon(
    fs.readFileSync(path.join(sdkDir, "bin/7zSD.sfx")),
  );
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
  const zip = path.join(dir, `MEMO-Windows-${version}.zip`);
  const guide = path.join(dir, "사용안내.txt");
  fs.writeFileSync(
    guide,
    "\ufeff기존 MEMO를 완전히 종료한 뒤 압축을 모두 풀고 동봉된 EXE 파일을 실행하세요.\n메모와 설정은 %APPDATA%\\MEMO에 유지됩니다.\n코드 서명이 없는 개발 빌드이므로 Windows 확인창이 나타날 수 있습니다.\n",
    "utf8",
  );
  fs.rmSync(zip, { force: true });
  await run(
    sevenZip,
    [
      "a",
      "-tzip",
      "-mx=0",
      "-bso0",
      zip,
      path.basename(exe),
      path.basename(guide),
    ],
    dir,
  );
  await run(sevenZip, ["t", zip, "-bso0"]);
  const zipHash = crypto
    .createHash("sha256")
    .update(fs.readFileSync(zip))
    .digest("hex");
  fs.writeFileSync(`${zip}.sha256`, `${zipHash}  ${path.basename(zip)}\n`);
  console.log(`Windows ZIP: ${zip}`);
  console.log(
    `Portable Windows app: ${exe} (${(fs.statSync(exe).size / 1024 / 1024).toFixed(1)} MiB)`,
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
