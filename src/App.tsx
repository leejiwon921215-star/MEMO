import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpFromLine,
  Check,
  CheckCheck,
  ChevronDown,
  ClipboardCopy,
  ClipboardPlus,
  Folder,
  FolderPlus,
  List,
  LockKeyhole,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Settings2,
  Star,
  Trash2,
  UnlockKeyhole,
  X,
  Pencil,
} from "lucide-react";
import { Modal } from "./components/Modal";
import { SectionEditor } from "./components/SectionEditor";
import { Toolbar } from "./components/Toolbar";
import {
  id,
  initialData,
  isMemoData,
  makeNote,
  mergeBackup,
  noteText,
  plainText,
  readData,
  saveData,
  type Action,
  type CopyAction,
  type MemoData,
  type Note,
  type Section,
  type Shortcut,
  type WindowSettings,
} from "./lib/model";

type DeleteTarget =
  | { type: "note"; noteId: string; title: string }
  | { type: "section"; noteId: string; sectionId: string; title: string }
  | { type: "shortcut"; shortcutId: string; title: string };
type ActionDialog = { kind: "folder" | "copy"; editingId?: string };
export default function App() {
  const [data, setData] = useState<MemoData | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const [saveError, setSaveError] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [panel, setPanel] = useState<
    "notes" | "menu" | "shortcuts" | "window" | null
  >(null);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [actionDialog, setActionDialog] = useState<ActionDialog | null>(null);
  const [label, setLabel] = useState("");
  const [path, setPath] = useState("");
  const [placement, setPlacement] = useState<"top" | "body">("top");
  const [copyMode, setCopyMode] = useState<"note" | "text">("note");
  const [copyNoteId, setCopyNoteId] = useState("");
  const [copyText, setCopyText] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [settings, setSettings] = useState<WindowSettings>({
    alwaysOnTop: false,
    sizeLocked: false,
    width: 520,
    height: 760,
  });
  const [windowBusy, setWindowBusy] = useState(false);
  const [windowError, setWindowError] = useState("");
  const [widthInput, setWidthInput] = useState("520");
  const [heightInput, setHeightInput] = useState("760");
  const [backup, setBackup] = useState<MemoData | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const titleInput = useRef<HTMLInputElement>(null);
  const native = !!window.memoDesktop;
  const note = data?.notes.find((n) => n.id === data.selectedId) || null;
  const shortcuts = data?.shortcuts || [];

  useEffect(() => {
    let canceled = false;
    readData()
      .then((value) => {
        if (!canceled) setData(value);
      })
      .catch((error) => {
        if (!canceled) {
          setBlocked(true);
          setSaveState("error");
          setSaveError(error.message);
          setData(initialData());
        }
      });
    window.memoDesktop
      ?.getWindowSettings()
      .then((value) => {
        if (!canceled) setSettings(value);
      })
      .catch(() => {
        if (!canceled) setNotice("창 설정을 읽지 못했습니다.");
      });
    return () => {
      canceled = true;
    };
  }, []);
  useEffect(() => {
    if (!data || blocked) return;
    const current = ++revision.current;
    setSaveState("saving");
    saveData(data)
      .then(() => {
        if (current === revision.current) {
          setSaveState("saved");
          setSaveError("");
        }
      })
      .catch((error) => {
        if (current === revision.current) {
          setSaveState("error");
          setSaveError(
            error.message || "저장하지 못했습니다. 메모를 백업해 주세요.",
          );
        }
      });
  }, [data, blocked]);
  useEffect(() => {
    document.title = note?.title ? `${note.title} — MEMO` : "MEMO";
  }, [note?.title]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (saveState !== "saved") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveState]);

  function updateNote(
    noteId: string,
    patch: Partial<Note> | ((note: Note) => Partial<Note>),
  ) {
    setData(
      (current) =>
        current && {
          ...current,
          notes: current.notes.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  ...(typeof patch === "function" ? patch(n) : patch),
                  updatedAt: new Date().toISOString(),
                }
              : n,
          ),
        },
    );
  }
  function updateSection(
    noteId: string,
    sectionId: string,
    patch: Partial<Section>,
  ) {
    updateNote(noteId, (n) => ({
      sections: n.sections.map((s) =>
        s.id === sectionId ? { ...s, ...patch } : s,
      ),
    }));
  }
  function selectNote(noteId: string) {
    setEditor(null);
    setActiveSection(null);
    setData((current) => current && { ...current, selectedId: noteId });
    setPanel(null);
  }
  function addNote() {
    const fresh = makeNote();
    setEditor(null);
    setActiveSection(null);
    setPanel(null);
    setData(
      (current) =>
        current && {
          ...current,
          selectedId: fresh.id,
          notes: [fresh, ...current.notes],
        },
    );
    setTimeout(() => {
      titleInput.current?.focus();
      titleInput.current?.select();
    }, 0);
  }
  function addSection() {
    if (!note) return;
    updateNote(note.id, (n) => ({
      sections: [...n.sections, { id: id(), title: "", content: "<p></p>" }],
    }));
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        ".section:last-of-type .tiptap",
      );
      el?.focus();
      el?.scrollIntoView({ block: "nearest" });
    }, 0);
  }
  function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "shortcut")
      setData(
        (current) =>
          current && {
            ...current,
            shortcuts: (current.shortcuts || []).filter(
              (s) => s.id !== deleteTarget.shortcutId,
            ),
          },
      );
    else if (deleteTarget.type === "note") {
      setEditor(null);
      setActiveSection(null);
      setData((current) => {
        if (!current) return current;
        const notes = current.notes.filter((n) => n.id !== deleteTarget.noteId);
        return {
          ...current,
          notes,
          selectedId:
            current.selectedId === deleteTarget.noteId
              ? notes[0]?.id || null
              : current.selectedId,
        };
      });
    } else {
      if (deleteTarget.sectionId === activeSection) {
        setEditor(null);
        setActiveSection(null);
      }
      updateNote(deleteTarget.noteId, (n) => ({
        sections: n.sections.filter((s) => s.id !== deleteTarget.sectionId),
      }));
      setTimeout(
        () => document.querySelector<HTMLElement>(".tiptap")?.focus(),
        0,
      );
    }
    setDeleteTarget(null);
    setNotice("삭제했습니다.");
  }
  async function runAction(action: Action) {
    if (action.type === "folder") {
      if (!window.memoDesktop) {
        setNotice("폴더 열기는 Windows 앱에서 사용할 수 있습니다.");
        return;
      }
      try {
        const result = await window.memoDesktop.openFolder(action.path);
        if (!result.ok) setNotice(result.error);
      } catch {
        setNotice("폴더를 열지 못했습니다.");
      }
      return;
    }
    let text = "";
    if (action.mode === "text") text = action.text;
    else {
      const source = data?.notes.find((n) => n.id === action.noteId);
      if (!source) {
        setNotice("연결된 메모가 없습니다. 바로가기 관리에서 수정해 주세요.");
        return;
      }
      text = noteText(source);
    }
    if (!text) {
      setNotice("복사할 내용이 없습니다.");
      return;
    }
    try {
      if (window.memoDesktop) {
        const result = await window.memoDesktop.copyText(text);
        if (!result.ok) throw new Error(result.error);
      } else {
        if (!navigator.clipboard)
          throw new Error("클립보드를 사용할 수 없습니다.");
        await navigator.clipboard.writeText(text);
      }
      setNotice(`${action.label}: 복사했습니다.`);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "복사하지 못했습니다. 클립보드 권한을 확인해 주세요.",
      );
    }
  }
  function openAction(kind: "folder" | "copy", shortcut?: Shortcut) {
    setPanel(null);
    setActionDialog({ kind, editingId: shortcut?.id });
    setLabel(shortcut?.label || "");
    setPath(shortcut?.type === "folder" ? shortcut.path : "");
    setPlacement("top");
    setCopyMode(shortcut?.type === "copy" ? shortcut.mode : "note");
    setCopyNoteId(
      shortcut?.type === "copy" && shortcut.mode === "note"
        ? shortcut.noteId
        : note?.id || "",
    );
    setCopyText(
      shortcut?.type === "copy" && shortcut.mode === "text"
        ? shortcut.text
        : editor?.state.doc.textBetween(
            editor.state.selection.from,
            editor.state.selection.to,
            "\n",
          ) || "",
    );
    setActionError("");
  }
  async function chooseFolder() {
    if (!window.memoDesktop) return;
    try {
      const selected = await window.memoDesktop.chooseFolder();
      if (selected) {
        setPath(selected);
        if (!label)
          setLabel(selected.split(/[\\/]/).filter(Boolean).at(-1) || "폴더");
        setActionError("");
      }
    } catch {
      setActionError(
        "폴더 선택창을 열지 못했습니다. 경로를 직접 입력해 주세요.",
      );
    }
  }
  function saveAction() {
    if (!actionDialog) return;
    if (!label.trim()) {
      setActionError("버튼 이름을 입력해 주세요.");
      return;
    }
    let action: Action;
    if (actionDialog.kind === "folder") {
      const folder = path.trim();
      if (
        !/^([a-z]:[\\/]|\\\\[^\\]+\\[^\\]+|\/)/i.test(folder) ||
        /^[a-z][a-z\d+.-]*:\/\//i.test(folder)
      ) {
        setActionError(
          "C:\\Users\\이름\\Documents 처럼 전체 폴더 경로를 입력해 주세요.",
        );
        return;
      }
      action = { type: "folder", label: label.trim(), path: folder };
    } else if (copyMode === "note") {
      if (!data?.notes.some((n) => n.id === copyNoteId)) {
        setActionError("복사할 메모를 선택해 주세요.");
        return;
      }
      action = {
        type: "copy",
        label: label.trim(),
        mode: "note",
        noteId: copyNoteId,
      };
    } else {
      if (!copyText.trim()) {
        setActionError("복사할 문구를 입력해 주세요.");
        return;
      }
      action = {
        type: "copy",
        label: label.trim(),
        mode: "text",
        text: copyText,
      };
    }
    if (placement === "body" && !actionDialog.editingId) {
      if (!editor || editor.isDestroyed) {
        setActionError("버튼을 넣을 본문을 먼저 클릭해 주세요.");
        return;
      }
      const inserted =
        action.type === "folder"
          ? {
              type: "folderButton",
              attrs: { label: action.label, path: action.path },
            }
          : {
              type: "copyButton",
              attrs: {
                label: action.label,
                mode: action.mode,
                ...(action.mode === "text"
                  ? { text: action.text }
                  : { noteId: action.noteId }),
              },
            };
      editor
        .chain()
        .focus()
        .insertContent([inserted, { type: "text", text: " " }])
        .run();
    } else {
      const shortcut = { ...action, id: actionDialog.editingId || id() };
      setData(
        (current) =>
          current && {
            ...current,
            shortcuts: actionDialog.editingId
              ? (current.shortcuts || []).map((s) =>
                  s.id === actionDialog.editingId ? shortcut : s,
                )
              : [...(current.shortcuts || []), shortcut],
          },
      );
    }
    setActionDialog(null);
    setNotice(
      actionDialog.editingId ? "버튼을 수정했습니다." : "버튼을 추가했습니다.",
    );
  }
  function moveShortcut(shortcutId: string, offset: number) {
    setData((current) => {
      if (!current) return current;
      const list = [...(current.shortcuts || [])];
      const index = list.findIndex((s) => s.id === shortcutId);
      const target = index + offset;
      if (index < 0 || target < 0 || target >= list.length) return current;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...current, shortcuts: list };
    });
  }
  async function windowAction(kind: "top" | "lock") {
    if (!window.memoDesktop) {
      setNotice("창 고정과 크기 조절은 Windows 앱에서 사용할 수 있습니다.");
      return;
    }
    setWindowBusy(true);
    try {
      const result =
        kind === "top"
          ? await window.memoDesktop.setAlwaysOnTop(!settings.alwaysOnTop)
          : await window.memoDesktop.setSizeLocked(!settings.sizeLocked);
      if (!result.ok) setNotice(result.error);
      else
        setSettings((current) => ({
          ...current,
          [kind === "top" ? "alwaysOnTop" : "sizeLocked"]:
            kind === "top" ? !current.alwaysOnTop : !current.sizeLocked,
        }));
    } catch {
      setNotice("창 설정을 변경하지 못했습니다.");
    } finally {
      setWindowBusy(false);
    }
  }
  async function openWindowSettings() {
    setPanel("window");
    setWindowError("");
    try {
      const current = window.memoDesktop
        ? await window.memoDesktop.getWindowSettings()
        : { ...settings, width: window.innerWidth, height: window.innerHeight };
      setSettings(current);
      setWidthInput(String(current.width));
      setHeightInput(String(current.height));
    } catch {
      setNotice("창 크기를 읽지 못했습니다.");
    }
  }
  async function resizeWindow() {
    if (!window.memoDesktop) {
      setNotice("창 크기 조절은 Windows 앱에서 사용할 수 있습니다.");
      return;
    }
    try {
      const result = await window.memoDesktop.resizeWindow(
        Number(widthInput),
        Number(heightInput),
      );
      if (!result.ok) setWindowError(result.error);
      else {
        setWindowError("");
        setSettings(await window.memoDesktop.getWindowSettings());
        setNotice("창 크기를 적용했습니다.");
      }
    } catch {
      setWindowError("창 크기를 변경하지 못했습니다.");
    }
  }
  function exportBackup() {
    if (!data) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `MEMO-백업-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setPanel(null);
  }
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error();
      const value: unknown = JSON.parse(await file.text());
      if (!isMemoData(value)) throw new Error();
      setBackup(value);
      setPanel(null);
    } catch {
      setNotice("올바른 MEMO 백업 파일이 아닙니다.");
    }
    if (fileInput.current) fileInput.current.value = "";
  }
  function confirmImport() {
    if (!backup) return;
    setEditor(null);
    setActiveSection(null);
    setData((current) => current && mergeBackup(current, backup));
    setBackup(null);
    setNotice("기존 메모를 유지하며 가져왔습니다.");
  }
  const filteredNotes = (data?.notes || []).filter(
    (n) =>
      (!favorites || n.favorite) &&
      `${n.title} ${n.sections.map((s) => `${s.title} ${plainText(s.content)}`).join(" ")}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  if (!data) return <div className="loading">불러오는 중…</div>;
  return (
    <main className="memo-app">
      <header className="pinned-header">
        <div className="note-bar">
          <button
            className="chrome-button"
            aria-label="메모 목록"
            title="메모 목록"
            onClick={() => setPanel("notes")}
          >
            <List size={17} />
          </button>
          <input
            ref={titleInput}
            className="compact-title"
            aria-label="메모 제목"
            placeholder="메모 제목"
            disabled={!note}
            value={note?.title || ""}
            onChange={(event) =>
              note && updateNote(note.id, { title: event.target.value })
            }
          />
          <button
            className="chrome-button"
            aria-label="새 메모"
            title="새 메모"
            onClick={addNote}
          >
            <Plus size={17} />
          </button>
          <button
            className="chrome-button"
            aria-label="메모 메뉴"
            title="메모 메뉴"
            onClick={() => setPanel("menu")}
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
        <div className="quick-tools" aria-label="고정 기능">
          <button className="retro-button" onClick={() => openAction("folder")}>
            <FolderPlus size={15} />
            폴더 추가
          </button>
          <button className="retro-button" onClick={() => openAction("copy")}>
            <ClipboardPlus size={15} />
            복사 버튼
          </button>
          <div className="toolbar-spacer" />
          <button
            className={`chrome-button ${settings.alwaysOnTop ? "pressed" : ""}`}
            role="switch"
            aria-label="항상 위에 표시"
            aria-checked={settings.alwaysOnTop}
            title="항상 위에 표시"
            disabled={windowBusy}
            onClick={() => void windowAction("top")}
          >
            <Pin size={15} />
          </button>
          <button
            className={`chrome-button ${settings.sizeLocked ? "pressed" : ""}`}
            role="switch"
            aria-label="창 크기 고정"
            aria-checked={settings.sizeLocked}
            title={
              settings.sizeLocked ? "창 크기 고정 해제" : "현재 창 크기 고정"
            }
            disabled={windowBusy}
            onClick={() => void windowAction("lock")}
          >
            {settings.sizeLocked ? (
              <LockKeyhole size={15} />
            ) : (
              <UnlockKeyhole size={15} />
            )}
          </button>
          <button
            className="chrome-button"
            aria-label="창 크기 설정"
            title="창 크기 설정"
            onClick={() => void openWindowSettings()}
          >
            <Settings2 size={15} />
          </button>
        </div>
        {shortcuts.length > 0 && (
          <div className="shortcut-bar" aria-label="고정 바로가기">
            <div className="shortcut-scroll">
              {shortcuts.map((shortcut) => (
                <button
                  key={shortcut.id}
                  className={`shortcut-button ${shortcut.type}`}
                  title={
                    shortcut.type === "folder"
                      ? shortcut.path
                      : `${shortcut.label} 복사`
                  }
                  onClick={() => void runAction(shortcut)}
                >
                  {shortcut.type === "folder" ? (
                    <Folder size={14} />
                  ) : (
                    <ClipboardCopy size={14} />
                  )}
                  <span>{shortcut.label}</span>
                </button>
              ))}
            </div>
            <button
              className="chrome-button"
              aria-label="바로가기 관리"
              title="바로가기 관리"
              onClick={() => setPanel("shortcuts")}
            >
              <Pencil size={13} />
            </button>
          </div>
        )}
        {note && (
          <Toolbar
            editor={editor && !editor.isDestroyed ? editor : null}
            background={note.background}
            onBackground={(background) => updateNote(note.id, { background })}
          />
        )}
      </header>
      {saveError && (
        <div className="storage-warning" role="alert">
          {saveError}
          <button onClick={exportBackup}>백업 저장</button>
        </div>
      )}
      {note ? (
        <div
          className="paper-scroll"
          style={{ backgroundColor: note.background }}
        >
          <div className="paper-content" key={note.id}>
            {note.sections.map((section, index) => (
              <SectionEditor
                key={section.id}
                section={section}
                index={index}
                active={activeSection === section.id}
                onChange={(patch) => updateSection(note.id, section.id, patch)}
                onFocus={(focused, sectionId) => {
                  setEditor(focused);
                  setActiveSection(sectionId);
                }}
                onDelete={() =>
                  setDeleteTarget({
                    type: "section",
                    noteId: note.id,
                    sectionId: section.id,
                    title: section.title,
                  })
                }
                onOpenFolder={(folder) =>
                  void runAction({
                    type: "folder",
                    label: "폴더",
                    path: folder,
                  })
                }
                onCopy={(action) => void runAction(action)}
              />
            ))}
            <button className="add-section" onClick={addSection}>
              <Plus size={15} />
              섹션 추가
            </button>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <button className="retro-button" onClick={addNote}>
            <Plus size={16} />새 메모
          </button>
        </div>
      )}
      <footer
        className={`save-status ${saveState === "error" ? "error" : ""}`}
        role="status"
      >
        {saveState === "saved" ? (
          <>
            <CheckCheck size={12} />
            저장됨
          </>
        ) : saveState === "saving" ? (
          "저장 중…"
        ) : (
          "저장 오류"
        )}
      </footer>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="visually-hidden"
        aria-label="메모 백업 파일"
        onChange={(event) => void importBackup(event.target.files?.[0])}
      />
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="알림 닫기"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {panel === "notes" && (
        <Modal title="메모 목록" onClose={() => setPanel(null)}>
          <div className="search-box">
            <Search size={15} />
            <input
              aria-label="메모 검색"
              placeholder="메모 검색"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button
              className={`icon-button ${favorites ? "pressed" : ""}`}
              aria-label="즐겨찾기만 보기"
              aria-pressed={favorites}
              onClick={() => setFavorites((value) => !value)}
            >
              <Star size={15} fill={favorites ? "currentColor" : "none"} />
            </button>
          </div>
          <div className="notes-list">
            {filteredNotes.map((n) => (
              <button
                key={n.id}
                className={`note-choice ${note?.id === n.id ? "selected" : ""}`}
                onClick={() => selectNote(n.id)}
              >
                <span>{n.title || "제목 없음"}</span>
                {n.favorite && <Star size={12} fill="currentColor" />}
                {note?.id === n.id && <Check size={14} />}
              </button>
            ))}
            {!filteredNotes.length && (
              <p className="field-hint">메모가 없습니다.</p>
            )}
          </div>
          <div className="modal-actions">
            <button className="retro-button" onClick={addNote}>
              <Plus size={15} />새 메모
            </button>
          </div>
        </Modal>
      )}
      {panel === "menu" && (
        <Modal title="메모 메뉴" onClose={() => setPanel(null)}>
          <div className="menu-list">
            <button onClick={exportBackup}>
              <ArrowDownToLine size={17} />
              백업 저장
            </button>
            <button onClick={() => fileInput.current?.click()}>
              <ArrowUpFromLine size={17} />
              백업 가져오기
            </button>
            <button onClick={() => setPanel("shortcuts")}>
              <Settings2 size={17} />
              바로가기 관리
            </button>
            <button onClick={() => void openWindowSettings()}>
              <Settings2 size={17} />창 크기 설정
            </button>
            {note && (
              <>
                <button
                  onClick={() => {
                    updateNote(note.id, { favorite: !note.favorite });
                    setPanel(null);
                  }}
                >
                  <Star size={17} />
                  {note.favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                </button>
                <button
                  className="danger-text"
                  onClick={() => {
                    setPanel(null);
                    setDeleteTarget({
                      type: "note",
                      noteId: note.id,
                      title: note.title,
                    });
                  }}
                >
                  <Trash2 size={17} />
                  메모 삭제
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
      {panel === "window" && (
        <Modal title="창 크기 설정" onClose={() => setPanel(null)}>
          <div className="window-dimensions">
            <label className="field-label">
              가로 (px)
              <input
                className="form-input"
                type="number"
                min={320}
                max={16384}
                aria-label="창 가로 크기"
                value={widthInput}
                disabled={settings.sizeLocked}
                onChange={(event) => setWidthInput(event.target.value)}
              />
            </label>
            <span>×</span>
            <label className="field-label">
              세로 (px)
              <input
                className="form-input"
                type="number"
                min={360}
                max={16384}
                aria-label="창 세로 크기"
                value={heightInput}
                disabled={settings.sizeLocked}
                onChange={(event) => setHeightInput(event.target.value)}
              />
            </label>
          </div>
          <p className="field-hint">
            창 가장자리로 크기를 조절할 수 있습니다. 최소 320 × 360px.
          </p>
          <label className="setting-switch">
            <span>현재 크기 고정</span>
            <button
              className={`retro-button ${settings.sizeLocked ? "pressed" : ""}`}
              role="switch"
              aria-label="설정에서 창 크기 고정"
              aria-checked={settings.sizeLocked}
              disabled={windowBusy}
              onClick={() => void windowAction("lock")}
            >
              {settings.sizeLocked ? "켜짐" : "꺼짐"}
            </button>
          </label>
          {windowError && (
            <p className="field-error" role="alert">
              {windowError}
            </p>
          )}
          {!native && (
            <p className="field-hint">Windows 앱에서 사용할 수 있습니다.</p>
          )}
          <div className="modal-actions">
            <button className="secondary-button" onClick={() => setPanel(null)}>
              닫기
            </button>
            <button
              className="primary-button"
              disabled={settings.sizeLocked || !native}
              onClick={() => void resizeWindow()}
            >
              크기 적용
            </button>
          </div>
        </Modal>
      )}
      {panel === "shortcuts" && (
        <Modal title="바로가기 관리" onClose={() => setPanel(null)}>
          <div className="shortcut-manager">
            {shortcuts.map((shortcut, index) => (
              <div key={shortcut.id} className="shortcut-row">
                <span>
                  {shortcut.type === "folder" ? (
                    <Folder size={15} />
                  ) : (
                    <ClipboardCopy size={15} />
                  )}
                  {shortcut.label}
                </span>
                <button
                  className="icon-button"
                  aria-label={`${shortcut.label} 왼쪽으로 이동`}
                  disabled={index === 0}
                  onClick={() => moveShortcut(shortcut.id, -1)}
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`${shortcut.label} 오른쪽으로 이동`}
                  disabled={index === shortcuts.length - 1}
                  onClick={() => moveShortcut(shortcut.id, 1)}
                >
                  <ArrowRight size={14} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`${shortcut.label} 수정`}
                  onClick={() => openAction(shortcut.type, shortcut)}
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="icon-button danger-text"
                  aria-label={`${shortcut.label} 버튼 삭제`}
                  onClick={() => {
                    setPanel(null);
                    setDeleteTarget({
                      type: "shortcut",
                      shortcutId: shortcut.id,
                      title: shortcut.label,
                    });
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {!shortcuts.length && (
              <p className="field-hint">
                상단의 ‘폴더 추가’ 또는 ‘복사 버튼’으로 추가하세요.
              </p>
            )}
          </div>
        </Modal>
      )}
      {deleteTarget && (
        <Modal
          title={
            deleteTarget.type === "note"
              ? "메모를 삭제할까요?"
              : deleteTarget.type === "section"
                ? "섹션을 삭제할까요?"
                : "버튼을 삭제할까요?"
          }
          onClose={() => setDeleteTarget(null)}
        >
          <p className="modal-description">
            <strong>{deleteTarget.title || "제목 없음"}</strong>
            {deleteTarget.type === "shortcut"
              ? " 바로가기 버튼만 삭제됩니다. 폴더와 원본 메모는 유지됩니다."
              : "의 내용이 삭제됩니다. 이 작업은 되돌릴 수 없습니다."}
          </p>
          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => setDeleteTarget(null)}
            >
              취소
            </button>
            <button className="danger-button" onClick={confirmDelete}>
              삭제하기
            </button>
          </div>
        </Modal>
      )}
      {actionDialog && (
        <Modal
          title={`${actionDialog.kind === "folder" ? "폴더" : "복사"} 버튼 ${actionDialog.editingId ? "수정" : "추가"}`}
          onClose={() => setActionDialog(null)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveAction();
            }}
          >
            <label className="field-label" htmlFor="action-label">
              버튼 이름
            </label>
            <input
              autoFocus
              id="action-label"
              className="form-input"
              value={label}
              maxLength={80}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={
                actionDialog.kind === "folder" ? "지재권폴더" : "답변 복사"
              }
            />
            {actionDialog.kind === "folder" ? (
              <>
                <label className="field-label" htmlFor="action-path">
                  폴더 경로
                </label>
                <div className="folder-path-field">
                  <input
                    id="action-path"
                    className="form-input"
                    placeholder={"C:\\Users\\이름\\Documents"}
                    value={path}
                    onChange={(event) => setPath(event.target.value)}
                  />
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={!native}
                    onClick={() => void chooseFolder()}
                  >
                    찾아보기
                  </button>
                </div>
                {!native && (
                  <p className="field-hint">
                    폴더 열기는 Windows 앱에서 동작합니다.
                  </p>
                )}
              </>
            ) : (
              <>
                <fieldset>
                  <legend>복사할 내용</legend>
                  <label>
                    <input
                      type="radio"
                      name="copy-mode"
                      value="note"
                      checked={copyMode === "note"}
                      onChange={() => setCopyMode("note")}
                    />
                    저장된 메모
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="copy-mode"
                      value="text"
                      checked={copyMode === "text"}
                      onChange={() => setCopyMode("text")}
                    />
                    직접 입력한 문구
                  </label>
                </fieldset>
                {copyMode === "note" ? (
                  <>
                    <select
                      className="form-input"
                      aria-label="복사할 메모"
                      value={copyNoteId}
                      onChange={(event) => setCopyNoteId(event.target.value)}
                    >
                      <option value="" disabled>
                        메모 선택
                      </option>
                      {data.notes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.title || "제목 없음"}
                        </option>
                      ))}
                    </select>
                    <p className="field-hint">
                      버튼을 누르면 선택한 메모의 최신 본문을 복사합니다.
                    </p>
                    <textarea
                      className="form-input preview-text"
                      aria-label="복사 내용 미리보기"
                      readOnly
                      value={
                        data.notes.find((n) => n.id === copyNoteId)
                          ? noteText(
                              data.notes.find((n) => n.id === copyNoteId)!,
                            )
                          : ""
                      }
                    />
                  </>
                ) : (
                  <textarea
                    className="form-input"
                    rows={5}
                    aria-label="복사할 문구"
                    value={copyText}
                    onChange={(event) => setCopyText(event.target.value)}
                    placeholder="복사할 문구를 입력하세요."
                  />
                )}
              </>
            )}
            {!actionDialog.editingId && (
              <fieldset>
                <legend>추가 위치</legend>
                <label>
                  <input
                    type="radio"
                    name="placement"
                    value="top"
                    checked={placement === "top"}
                    onChange={() => setPlacement("top")}
                  />
                  상단 고정
                </label>
                <label>
                  <input
                    type="radio"
                    name="placement"
                    value="body"
                    checked={placement === "body"}
                    disabled={!editor || editor.isDestroyed}
                    onChange={() => setPlacement("body")}
                  />
                  본문 커서 위치
                </label>
              </fieldset>
            )}
            {actionError && (
              <p className="field-error" role="alert">
                {actionError}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setActionDialog(null)}
              >
                취소
              </button>
              <button type="submit" className="primary-button">
                {actionDialog.editingId ? "저장" : "버튼 추가"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {backup && (
        <Modal title="백업 메모를 가져올까요?" onClose={() => setBackup(null)}>
          <p className="modal-description">
            메모 {backup.notes.length}개와 바로가기{" "}
            {(backup.shortcuts || []).length}개를 추가합니다. 기존 메모는
            유지됩니다.
          </p>
          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => setBackup(null)}
            >
              취소
            </button>
            <button className="primary-button" onClick={confirmImport}>
              가져오기
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
