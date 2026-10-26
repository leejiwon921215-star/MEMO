import type { MemoData } from "./model";
import { isHexColor, readableInk } from "./colors";
const selector = "[data-folder-button], [data-copy-button]";
export function colorButtons(data: MemoData) {
  const buttons = (data.shortcuts || []).map((s) => ({
    key: `top:${s.id}`,
    label: s.label,
    location: "상단",
  }));
  for (const note of data.notes)
    for (const section of note.sections) {
      const doc = new DOMParser().parseFromString(section.content, "text/html");
      doc.querySelectorAll(selector).forEach((el, index) =>
        buttons.push({
          key: `body:${section.id}:${index}`,
          label: el.getAttribute("data-label") || "이름 없는 버튼",
          location: `${note.title || "제목 없음"} / ${section.title || "섹션"}`,
        }),
      );
    }
  return buttons;
}
export function applyButtonColors(
  data: MemoData,
  selected: string[],
  background?: string,
): MemoData {
  if (background !== undefined && !isHexColor(background)) return data;
  const keys = new Set(selected);
  return {
    ...data,
    shortcuts: (data.shortcuts || []).map((s) => {
      if (!keys.has(`top:${s.id}`)) return s;
      const { background: _old, ...rest } = s;
      return background ? { ...rest, background } : rest;
    }),
    notes: data.notes.map((note) => {
      let changed = false;
      const sections = note.sections.map((section) => {
        const doc = new DOMParser().parseFromString(
          section.content,
          "text/html",
        );
        let edited = false;
        doc.querySelectorAll<HTMLElement>(selector).forEach((el, index) => {
          if (!keys.has(`body:${section.id}:${index}`)) return;
          edited = true;
          if (background) {
            el.setAttribute("data-background", background);
            el.style.backgroundColor = background;
            el.style.color = readableInk(background);
          } else {
            el.removeAttribute("data-background");
            el.style.removeProperty("background-color");
            el.style.removeProperty("color");
            el.style.removeProperty("border-color");
          }
        });
        if (!edited) return section;
        changed = true;
        return { ...section, content: doc.body.innerHTML };
      });
      return changed
        ? { ...note, sections, updatedAt: new Date().toISOString() }
        : note;
    }),
  };
}
