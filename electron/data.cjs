const isHex = (value) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
function validPalettes(value) {
  return (
    value &&
    typeof value === "object" &&
    ["text", "highlight"].every((kind) => {
      const p = value[kind];
      return (
        p &&
        Array.isArray(p.recent) &&
        p.recent.length <= 12 &&
        p.recent.every(isHex) &&
        Array.isArray(p.favorites) &&
        p.favorites.length <= 32 &&
        p.favorites.every(isHex)
      );
    })
  );
}
function validData(data) {
  if (
    data?.version !== 1 ||
    (data.colorPalettes !== undefined && !validPalettes(data.colorPalettes)) ||
    (data.appearance !== undefined &&
      (!data.appearance ||
        typeof data.appearance !== "object" ||
        Array.isArray(data.appearance) ||
        typeof data.appearance.headerColor !== "string" ||
        !/^#[0-9a-f]{6}$/i.test(data.appearance.headerColor))) ||
    !Array.isArray(data.notes) ||
    data.notes.length > 10000 ||
    (data.selectedId !== null && typeof data.selectedId !== "string")
  )
    return false;
  const ids = new Set();
  const unique = (id) => {
    if (typeof id !== "string" || ids.has(id)) return false;
    ids.add(id);
    return true;
  };
  return (
    data.notes.every(
      (note) =>
        note &&
        unique(note.id) &&
        typeof note.title === "string" &&
        typeof note.background === "string" &&
        /^#[0-9a-f]{6}$/i.test(note.background) &&
        typeof note.favorite === "boolean" &&
        typeof note.updatedAt === "string" &&
        Number.isFinite(Date.parse(note.updatedAt)) &&
        Array.isArray(note.sections) &&
        note.sections.every(
          (section) =>
            section &&
            unique(section.id) &&
            typeof section.title === "string" &&
            typeof section.content === "string",
        ),
    ) &&
    (data.shortcuts === undefined ||
      (Array.isArray(data.shortcuts) &&
        data.shortcuts.length <= 1000 &&
        data.shortcuts.every(
          (a) =>
            a &&
            unique(a.id) &&
            typeof a.label === "string" &&
            (a.background === undefined || isHex(a.background)) &&
            (a.type === "folder"
              ? typeof a.path === "string"
              : a.type === "copy" &&
                (a.mode === "text"
                  ? typeof a.text === "string"
                  : a.mode === "note" && typeof a.noteId === "string")),
        )))
  );
}
module.exports = { validData };
