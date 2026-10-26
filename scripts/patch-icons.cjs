// Resource changes produce an unsigned application; no inherited vendor signature is reused.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
async function withMemoIcon(bytes) {
  const R = await import("resedit");
  const exe = R.NtExecutable.from(bytes, { ignoreCert: true });
  const resources = R.NtExecutableResource.from(exe);
  const codeSections = (image) =>
    image
      .getAllSections()
      .filter((section) => section.info.name !== ".rsrc")
      .map((section) => {
        const data = section.data ? Buffer.from(section.data) : Buffer.alloc(0);
        return `${section.info.name}:${crypto
          .createHash("sha256")
          .update(data.subarray(0, section.info.virtualSize || data.length))
          .digest("hex")}`;
      })
      .sort();
  const beforeCode = codeSections(exe);
  const unchanged = (entries) =>
    entries
      .filter((e) => e.type !== 3 && e.type !== 14)
      .map(
        (e) =>
          `${e.type}:${e.id}:${e.lang}:${crypto.createHash("sha256").update(Buffer.from(e.bin)).digest("hex")}`,
      )
      .sort();
  const before = unchanged(resources.entries);
  const icon = R.Data.IconFile.from(
    fs.readFileSync(path.resolve(__dirname, "../build/icon.ico")),
  );
  const groups = R.Resource.IconGroupEntry.fromEntries(resources.entries);
  for (const group of groups.length ? groups : [{ id: 1, lang: 1033 }])
    R.Resource.IconGroupEntry.replaceIconsForResource(
      resources.entries,
      group.id,
      group.lang,
      icon.icons.map((item) => item.data),
    );
  resources.outputResource(exe);
  const result = Buffer.from(exe.generate());
  const parsedExe = R.NtExecutable.from(result);
  const parsed = R.NtExecutableResource.from(parsedExe);
  if (JSON.stringify(beforeCode) !== JSON.stringify(codeSections(parsedExe)))
    throw new Error("Executable code sections changed while updating icons");
  if (JSON.stringify(before) !== JSON.stringify(unchanged(parsed.entries)))
    throw new Error("Non-icon executable resources changed");
  if (!R.Resource.IconGroupEntry.fromEntries(parsed.entries).length)
    throw new Error("Icon resources missing");
  return result;
}
module.exports = { withMemoIcon };
