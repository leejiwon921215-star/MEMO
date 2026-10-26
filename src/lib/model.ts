export interface Section {
  id: string;
  title: string;
  content: string;
}
export interface Note {
  id: string;
  title: string;
  background: string;
  favorite: boolean;
  updatedAt: string;
  sections: Section[];
}
export type CopyAction =
  | { type: "copy"; label: string; mode: "text"; text: string }
  | { type: "copy"; label: string; mode: "note"; noteId: string };
export type Action =
  { type: "folder"; label: string; path: string } | CopyAction;
export type Shortcut = Action & { id: string };
export interface MemoData {
  version: 1;
  notes: Note[];
  selectedId: string | null;
  shortcuts?: Shortcut[];
  appearance?: { headerColor: string };
}
export type NativeResult = { ok: true } | { ok: false; error: string };
export interface WindowSettings {
  alwaysOnTop: boolean;
  sizeLocked: boolean;
  width: number;
  height: number;
}
declare global {
  interface Window {
    memoDesktop?: {
      read: () => Promise<MemoData | null>;
      save: (data: MemoData) => Promise<NativeResult>;
      chooseFolder: () => Promise<string | null>;
      openFolder: (folder: string) => Promise<NativeResult>;
      copyText: (text: string) => Promise<NativeResult>;
      getAlwaysOnTop: () => Promise<boolean>;
      setAlwaysOnTop: (enabled: boolean) => Promise<NativeResult>;
      getWindowSettings: () => Promise<WindowSettings>;
      setSizeLocked: (enabled: boolean) => Promise<NativeResult>;
      resizeWindow: (width: number, height: number) => Promise<NativeResult>;
    };
  }
}
export const STORAGE_KEY = "memo-studio.v1";
export const id = () => crypto.randomUUID();
export function makeNote(): Note {
  return {
    id: id(),
    title: "새 메모",
    background: "#ffffff",
    favorite: false,
    updatedAt: new Date().toISOString(),
    sections: [{ id: id(), title: "", content: "<p></p>" }],
  };
}
export function initialData(): MemoData {
  const note = makeNote();
  return { version: 1, notes: [note], selectedId: note.id, shortcuts: [] };
}
export function isAction(action: unknown): action is Action {
  if (!action || typeof action !== "object") return false;
  const a = action as Record<string, unknown>;
  return (
    typeof a.label === "string" &&
    (a.type === "folder"
      ? typeof a.path === "string"
      : a.type === "copy" &&
        (a.mode === "text"
          ? typeof a.text === "string"
          : a.mode === "note" && typeof a.noteId === "string"))
  );
}
export function isMemoData(value: unknown): value is MemoData {
  if (!value || typeof value !== "object") return false;
  const data = value as MemoData;
  const ids = new Set<string>();
  const unique = (id: unknown) => {
    if (typeof id !== "string" || ids.has(id)) return false;
    ids.add(id);
    return true;
  };
  return (
    data.version === 1 &&
    (data.appearance === undefined ||
      (data.appearance !== null &&
        typeof data.appearance === "object" &&
        !Array.isArray(data.appearance) &&
        typeof data.appearance.headerColor === "string" &&
        /^#[0-9a-f]{6}$/i.test(data.appearance.headerColor))) &&
    (data.selectedId === null || typeof data.selectedId === "string") &&
    Array.isArray(data.notes) &&
    data.notes.length <= 10000 &&
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
          (shortcut) => isAction(shortcut) && unique(shortcut.id),
        )))
  );
}
export function plainText(html: string): string {
  return (
    new DOMParser()
      .parseFromString(html, "text/html")
      .body.textContent?.replace(/\s+/g, " ")
      .trim() || ""
  );
}
export function textWithLines(html: string): string {
  const body = new DOMParser().parseFromString(html, "text/html").body;
  function text(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (!(node instanceof Element)) return "";
    if (["SCRIPT", "STYLE"].includes(node.tagName)) return "";
    if (node.tagName === "BR") return "\n";
    const inner = [...node.childNodes].map(text).join("");
    return (
      inner + (/^(P|DIV|H[1-6]|LI|BLOCKQUOTE)$/.test(node.tagName) ? "\n" : "")
    );
  }
  return [...body.childNodes].map(text).join("").replace(/\n$/, "");
}
export const noteText = (note: Note) =>
  note.sections
    .map((section) => textWithLines(section.content))
    .filter(Boolean)
    .join("\n\n");
export async function readData(): Promise<MemoData> {
  const raw = window.memoDesktop
    ? await window.memoDesktop.read()
    : localStorage.getItem(STORAGE_KEY);
  if (raw === null) return initialData();
  const data: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!isMemoData(data))
    throw new Error(
      "저장된 메모를 읽을 수 없습니다. 기존 데이터 보호를 위해 자동 저장을 멈췄습니다.",
    );
  return {
    ...data,
    selectedId: data.notes.some((n) => n.id === data.selectedId)
      ? data.selectedId
      : data.notes[0]?.id || null,
    shortcuts: data.shortcuts || [],
  };
}
export async function saveData(data: MemoData) {
  if (window.memoDesktop) {
    const result = await window.memoDesktop.save(data);
    if (!result.ok) throw new Error(result.error);
  } else localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
export function mergeBackup(current: MemoData, backup: MemoData): MemoData {
  const mapping = new Map(backup.notes.map((note) => [note.id, id()]));
  const remapNote = (oldId: string) => {
    if (!mapping.has(oldId)) mapping.set(oldId, id());
    return mapping.get(oldId)!;
  };
  const notes = backup.notes.map((note) => ({
    ...note,
    id: remapNote(note.id),
    sections: note.sections.map((section) => {
      const doc = new DOMParser().parseFromString(section.content, "text/html");
      doc
        .querySelectorAll("[data-copy-button][data-note-id]")
        .forEach((button) =>
          button.setAttribute(
            "data-note-id",
            remapNote(button.getAttribute("data-note-id") || ""),
          ),
        );
      return { ...section, id: id(), content: doc.body.innerHTML };
    }),
  }));
  const shortcuts = (backup.shortcuts || []).map((shortcut) => ({
    ...shortcut,
    id: id(),
    ...(shortcut.type === "copy" && shortcut.mode === "note"
      ? { noteId: remapNote(shortcut.noteId) }
      : {}),
  }));
  return {
    ...current,
    ...(backup.appearance ? { appearance: { ...backup.appearance } } : {}),
    notes: [...notes, ...current.notes],
    selectedId: notes[0]?.id || current.selectedId,
    shortcuts: [...(current.shortcuts || []), ...shortcuts],
  };
}
