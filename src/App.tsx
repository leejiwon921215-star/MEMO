import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  FileText,
  Folder,
  FolderOpen,
  LayoutGrid,
  Leaf,
  LoaderCircle,
  LockKeyhole,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Modal } from "./components/Modal";
import { SectionEditor } from "./components/SectionEditor";
import { Toolbar } from "./components/Toolbar";
import {
  id,
  initialData,
  isMemoData,
  makeNote,
  plainText,
  readData,
  saveData,
  type MemoData,
  type Note,
  type Section,
} from "./lib/model";

type DeleteTarget =
  | { type: "note"; noteId: string; title: string }
  | { type: "section"; noteId: string; sectionId: string; title: string };
const paperColors = [
  { value: "#ffffff", label: "화이트" },
  { value: "#fff9ed", label: "크림" },
  { value: "#f1f6f0", label: "세이지" },
  { value: "#eef4fa", label: "블루" },
  { value: "#f7f0f5", label: "라벤더" },
];
const date = (value: string) =>
  new Date(value).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
export default function App() {
  const [expanded, setExpanded] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [data, setData] = useState<MemoData | null>(null);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const [saveError, setSaveError] = useState("");
  const [filter, setFilter] = useState<"all" | "favorite">("all");
  const [search, setSearch] = useState("");
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [folderModal, setFolderModal] = useState(false);
  const [folderLabel, setFolderLabel] = useState("");
  const [folderPath, setFolderPath] = useState("");
  const [folderError, setFolderError] = useState("");
  const [guide, setGuide] = useState(false);
  const [notice, setNotice] = useState("");
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [pinPending, setPinPending] = useState(false);
  const [importData, setImportData] = useState<MemoData | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const saveRevision = useRef(0);
  const note = data?.notes.find((n) => n.id === data.selectedId) || null;
  const native = !!window.memoDesktop;

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let canceled = false;
    readData()
      .then((value) => {
        if (!canceled) setData(value);
      })
      .catch((error) => {
        if (!canceled) {
          setStorageBlocked(true);
          setSaveState("error");
          setSaveError(error.message);
          setData(initialData());
        }
      });
    window.memoDesktop
      ?.getAlwaysOnTop()
      .then((value) => {
        if (!canceled) setAlwaysOnTop(value);
      })
      .catch(() => {
        if (!canceled)
          setNotice("창 고정 설정을 읽지 못했습니다. 다시 시도해 주세요.");
      });
    return () => {
      canceled = true;
    };
  }, []);
  useEffect(() => {
    if (!data || storageBlocked) return;
    const revision = ++saveRevision.current;
    setSaveState("saving");
    saveData(data)
      .then(() => {
        if (revision === saveRevision.current) {
          setSaveState("saved");
          setSaveError("");
        }
      })
      .catch((error) => {
        if (revision === saveRevision.current) {
          setSaveState("error");
          setSaveError(
            error.message ||
              "저장하지 못했습니다. 백업 파일을 내려받아 메모를 보관해 주세요.",
          );
        }
      });
  }, [data, storageBlocked]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const preventLoss = (event: BeforeUnloadEvent) => {
      if (saveState !== "saved") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [saveState]);

  function updateNote(
    noteId: string,
    change: Partial<Note> | ((note: Note) => Partial<Note>),
  ) {
    setData(
      (current) =>
        current && {
          ...current,
          notes: current.notes.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  ...(typeof change === "function" ? change(n) : change),
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
      sections: n.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    }));
  }
  function selectNote(noteId: string) {
    setActiveEditor(null);
    setActiveSection(null);
    setData((current) => current && { ...current, selectedId: noteId });
  }
  function addNote() {
    const fresh = makeNote();
    setSearch("");
    setFilter("all");
    setActiveEditor(null);
    setActiveSection(null);
    setData(
      (current) =>
        current && {
          ...current,
          selectedId: fresh.id,
          notes: [fresh, ...current.notes],
        },
    );
  }
  function addSection() {
    if (!note) return;
    const section = {
      id: id(),
      title: `새 섹션 ${note.sections.length + 1}`,
      content: "<p></p>",
    };
    updateNote(note.id, (current) => ({
      sections: [...current.sections, section],
    }));
    setTimeout(
      () =>
        document
          .querySelector(".section:last-of-type")
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      50,
    );
  }
  function confirmDelete() {
    if (!deleteTarget) return;
    setActiveEditor(null);
    setActiveSection(null);
    if (deleteTarget.type === "note") {
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
    } else
      updateNote(deleteTarget.noteId, (current) => ({
        sections: current.sections.filter(
          (s) => s.id !== deleteTarget.sectionId,
        ),
      }));
    setDeleteTarget(null);
    setNotice(
      deleteTarget.type === "note"
        ? "메모를 삭제했습니다."
        : "섹션을 삭제했습니다.",
    );
  }
  async function openFolder(path: string) {
    if (!window.memoDesktop) {
      setNotice(
        "폴더 열기는 Windows 데스크톱 앱에서 사용할 수 있어요. 저장한 폴더 연결은 그대로 유지됩니다.",
      );
      return;
    }
    try {
      const result = await window.memoDesktop.openFolder(path);
      if (!result.ok) setNotice(result.error);
    } catch {
      setNotice("폴더를 열지 못했습니다. 앱을 다시 실행해 주세요.");
    }
  }
  async function chooseFolder() {
    if (!window.memoDesktop) return;
    try {
      const path = await window.memoDesktop.chooseFolder();
      if (path) {
        setFolderPath(path);
        if (!folderLabel)
          setFolderLabel(
            path.split(/[\\/]/).filter(Boolean).at(-1) || "내 폴더",
          );
        setFolderError("");
      }
    } catch {
      setFolderError(
        "폴더 선택창을 열지 못했습니다. 경로를 직접 입력해 주세요.",
      );
    }
  }
  function addFolder() {
    if (!folderLabel.trim() || !folderPath.trim()) {
      setFolderError("버튼 이름과 폴더 경로를 모두 입력해 주세요.");
      return;
    }
    const path = folderPath.trim();
    if (
      !/^([a-z]:[\\/]|\\\\[^\\]+\\[^\\]+|\/)/i.test(path) ||
      /^[a-z][a-z\d+.-]*:\/\//i.test(path)
    ) {
      setFolderError(
        "C:\\Users\\이름\\Documents 처럼 전체 폴더 경로를 입력해 주세요.",
      );
      return;
    }
    if (!activeEditor || activeEditor.isDestroyed) {
      setFolderError("먼저 폴더 버튼을 넣을 섹션을 선택해 주세요.");
      return;
    }
    activeEditor
      .chain()
      .focus()
      .insertContent([
        { type: "folderButton", attrs: { label: folderLabel.trim(), path } },
        { type: "text", text: " " },
      ])
      .run();
    setFolderModal(false);
    setNotice("폴더 버튼을 추가했습니다.");
  }
  async function togglePin() {
    if (!window.memoDesktop) {
      setNotice("항상 위에 표시는 Windows 데스크톱 앱에서 사용할 수 있어요.");
      return;
    }
    setPinPending(true);
    try {
      const result = await window.memoDesktop.setAlwaysOnTop(!alwaysOnTop);
      if (!result.ok) setNotice(result.error);
      else {
        setAlwaysOnTop(!alwaysOnTop);
        setNotice(
          !alwaysOnTop
            ? "다른 창을 열어도 메모장이 위에 표시됩니다."
            : "항상 위에 표시를 해제했습니다.",
        );
      }
    } catch {
      setNotice("창 고정 설정을 변경하지 못했습니다.");
    } finally {
      setPinPending(false);
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
    setNotice(
      "백업 파일을 내려받았습니다. 소중한 메모를 안전하게 보관해 주세요.",
    );
  }
  async function readBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error("size");
      const backup: unknown = JSON.parse(await file.text());
      if (!isMemoData(backup)) throw new Error("schema");
      setImportData(backup);
    } catch {
      setNotice(
        "올바른 MEMO 백업 파일이 아닙니다. 파일 형식과 크기(50MB 이하)를 확인해 주세요.",
      );
    }
    if (importInput.current) importInput.current.value = "";
  }
  function restoreBackup() {
    if (!importData) return;
    // Merge instead of replacing, so existing notes are never silently lost.
    const restored = importData.notes.map((n) => ({
      ...n,
      id: id(),
      sections: n.sections.map((s) => ({ ...s, id: id() })),
    }));
    setActiveEditor(null);
    setActiveSection(null);
    setSearch("");
    setFilter("all");
    setData(
      (current) =>
        current && {
          ...current,
          notes: [...restored, ...current.notes],
          selectedId: restored[0]?.id || current.selectedId,
        },
    );
    setImportData(null);
    setNotice(
      `${restored.length}개의 메모를 가져왔습니다. 기존 메모도 그대로 보관됩니다.`,
    );
  }

  const visibleNotes = (data?.notes || []).filter(
    (n) =>
      (filter === "all" || n.favorite) &&
      `${n.title} ${n.sections.map((s) => `${s.title} ${plainText(s.content)}`).join(" ")}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  const favoriteCount = data?.notes.filter((n) => n.favorite).length || 0;
  const charCount =
    note?.sections.reduce(
      (sum, section) => sum + plainText(section.content).length,
      0,
    ) || 0;
  if (!data)
    return (
      <div className="loading">
        <Leaf size={32} />
        <p>나의 메모를 불러오고 있어요…</p>
      </div>
    );

  return (
    <div className={`retro-desktop ${expanded ? "expanded" : ""}`}>
      <div className="desktop-caption">
        <span>✦ MY LITTLE DIGITAL DESK</span>
        <span>EST. 2026 / PERSONAL COMPUTER</span>
      </div>
      <div className="app-frame">
        <div className="window-titlebar">
          <span className="pixel-app-icon" aria-hidden="true">
            ▤
          </span>
          <span>
            MEMO.exe{" "}
            <span className="window-title-sub">— 나의 작은 기록 보관함</span>
          </span>
          <div className="window-controls">
            <button
              onClick={() => setGuide(true)}
              aria-label="앱 도움말"
              title="도움말"
            >
              ?
            </button>
            <button
              onClick={() => setExpanded((value) => !value)}
              aria-label={expanded ? "화면 크기 복원" : "화면 크게 보기"}
              title={expanded ? "화면 크기 복원" : "화면 크게 보기"}
            >
              {expanded ? "▣" : "□"}
            </button>
          </div>
        </div>
        <div className="window-menubar">
          <button onClick={addNote}>
            새 메모<span>(N)</span>
          </button>
          <button onClick={exportBackup}>
            백업 저장<span>(S)</span>
          </button>
          <button onClick={() => importInput.current?.click()}>
            백업 열기<span>(O)</span>
          </button>
          <button onClick={() => setGuide(true)}>
            도움말<span>(H)</span>
          </button>
          <span className="menu-right">✧ a quiet place for busy minds</span>
        </div>
        <div className="app-shell">
          <aside className="sidebar">
            <a
              className="brand"
              href="#"
              onClick={(event) => {
                event.preventDefault();
                setFilter("all");
                setSearch("");
              }}
              aria-label="MEMO 홈"
            >
              <img className="pixel-brand" src="./pixel-memo.svg" alt="" />
              <span>
                MEMO<span className="brand-dot">.exe</span>
              </span>
            </a>
            <p className="brand-caption">생각을 저장하는 작은 컴퓨터</p>
            <div className="nav-caption">▸ MY FOLDERS</div>
            <nav aria-label="메모 탐색">
              <button
                className={`nav-item ${filter === "all" ? "selected" : ""}`}
                onClick={() => {
                  setFilter("all");
                  setSearch("");
                }}
              >
                <LayoutGrid size={18} />
                <span>모든 메모</span>
                <span className="nav-count">{data.notes.length}</span>
              </button>
              <button
                className={`nav-item ${filter === "favorite" ? "selected" : ""}`}
                onClick={() => {
                  setFilter("favorite");
                  setSearch("");
                }}
              >
                <Star size={18} />
                <span>즐겨찾기</span>
                <span className="nav-count">{favoriteCount}</span>
              </button>
            </nav>
            <div className="sidebar-divider" />
            <div className="nav-caption">▸ UTILITIES</div>
            <button className="nav-item" onClick={exportBackup}>
              <ArrowDownToLine size={18} />
              <span>메모 백업하기</span>
              <ArrowUpRight size={14} className="muted" />
            </button>
            <button
              className="nav-item"
              onClick={() => importInput.current?.click()}
            >
              <ArrowUpFromLine size={18} />
              <span>백업 가져오기</span>
            </button>
            <input
              ref={importInput}
              type="file"
              accept=".json,application/json"
              aria-label="메모 백업 파일"
              className="visually-hidden"
              onChange={(event) => void readBackup(event.target.files?.[0])}
            />
            <div className="sidebar-bottom">
              <div className="little-note">
                <img className="pixel-plant" src="./pixel-plant.svg" alt="" />
                <p>
                  작은 생각을 저장 중…
                  <br />
                  <strong>오늘도 나답게 기록해요.</strong>
                </p>
                <span className="note-doodle">✳</span>
              </div>
              <button
                className="nav-item guide-button"
                onClick={() => setGuide(true)}
              >
                <CircleHelp size={18} />
                <span>MEMO 사용 가이드</span>
                <ChevronRight size={14} />
              </button>
              <div className="local-status">
                <span className="status-dot" />
                <span>
                  {native
                    ? "내 컴퓨터에 안전하게 저장"
                    : "이 브라우저에 자동 저장"}
                </span>
                <LockKeyhole size={12} />
              </div>
            </div>
          </aside>

          <main className="workspace">
            <header className="workspace-header">
              <div className="breadcrumb">
                <span>내 작업 공간</span>
                <ChevronRight size={13} />
                <strong>{filter === "all" ? "모든 메모" : "즐겨찾기"}</strong>
              </div>
              <div className="header-right">
                <span className="workspace-private">
                  <LockKeyhole size={13} /> 나만의 공간
                </span>
                <span className="avatar">나</span>
              </div>
            </header>
            <div className="workspace-heading">
              <div>
                <div className="eyebrow">[ WELCOME TO YOUR LITTLE CORNER ]</div>
                <h1>
                  {filter === "all" ? "나의 메모" : "즐겨찾는 메모"}
                  <span className="heading-dot">.</span>
                </h1>
                <p>반짝 떠오른 생각들, 잊어버리기 전에 Ctrl + S 대신 MEMO.</p>
              </div>
              <button className="primary-button" onClick={addNote}>
                <Plus size={17} />새 메모 만들기
              </button>
            </div>
            <div className="memo-layout">
              <section className="note-list" aria-label="메모 목록">
                <div className="note-list-head">
                  <span>
                    {filter === "all" ? "모든 메모" : "즐겨찾기"}{" "}
                    <b>{visibleNotes.length}</b>
                  </span>
                  <FileText size={16} />
                </div>
                <div className="search-box">
                  <Search size={16} />
                  <input
                    placeholder="메모 검색"
                    aria-label="메모 검색"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  {search && (
                    <button
                      className="icon-button"
                      aria-label="검색 지우기"
                      onClick={() => setSearch("")}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <div className="note-cards">
                  {visibleNotes.map((n) => (
                    <button
                      key={n.id}
                      className={`note-card ${note?.id === n.id ? "current" : ""}`}
                      onClick={() => selectNote(n.id)}
                      aria-current={note?.id === n.id ? "true" : undefined}
                    >
                      <div className="note-card-top">
                        <span
                          className="paper-dot"
                          style={{
                            background:
                              n.background === "#ffffff"
                                ? "#e7e5df"
                                : n.background,
                            borderColor:
                              n.background === "#ffffff"
                                ? "#d9d7cf"
                                : undefined,
                          }}
                        />
                        {n.favorite && (
                          <Star
                            size={13}
                            className="favorite-star"
                            fill="currentColor"
                          />
                        )}
                        <span>{date(n.updatedAt)}</span>
                      </div>
                      <h3>{n.title || "제목 없는 메모"}</h3>
                      <p>
                        {n.sections
                          .map((s) => plainText(s.content))
                          .join(" ") || "아직 비어 있는 메모예요."}
                      </p>
                      <div className="note-card-footer">
                        <span>
                          <LayoutGrid size={11} />
                          {n.sections.length}개 섹션
                        </span>
                        {note?.id === n.id && (
                          <span className="editing-label">편집 중</span>
                        )}
                      </div>
                    </button>
                  ))}
                  {!visibleNotes.length && (
                    <div className="list-empty">
                      <Search size={24} />
                      <p>
                        {search
                          ? "검색 결과가 없어요."
                          : filter === "favorite"
                            ? "별표를 눌러 자주 쓰는\n메모를 모아보세요."
                            : "첫 메모를 만들어보세요."}
                      </p>
                    </div>
                  )}
                </div>
                <div className="list-bottom">
                  <span className="tiny-line" />
                  생각은 가볍게, 기록은 오래.
                </div>
              </section>
              <section className="editor-panel" aria-label="메모 편집기">
                {note ? (
                  <>
                    <div className="editor-topbar">
                      <span
                        className={`save-indicator ${saveState === "error" ? "save-error" : ""}`}
                        role="status"
                        title={saveError}
                      >
                        {saveState === "saved" ? (
                          <CheckCheck size={15} />
                        ) : saveState === "saving" ? (
                          <LoaderCircle size={15} className="spin" />
                        ) : (
                          <ShieldCheck size={15} />
                        )}
                        {saveState === "saved"
                          ? "모든 변경사항 저장됨"
                          : saveState === "saving"
                            ? "저장 중…"
                            : "저장 오류 · 백업해 주세요"}
                      </span>
                      <div className="editor-actions">
                        <button
                          className={`pin-toggle ${alwaysOnTop ? "pinned" : ""}`}
                          role="switch"
                          aria-label="항상 위에 표시"
                          aria-checked={alwaysOnTop}
                          disabled={pinPending}
                          onClick={() => void togglePin()}
                          title={
                            native
                              ? "다른 창 위에 메모장 고정"
                              : "Windows 앱에서 사용할 수 있어요"
                          }
                        >
                          <Pin size={13} />
                          <span>항상 위에</span>
                          <span className="switch-track">
                            <span />
                          </span>
                        </button>
                        <span className="toolbar-divider" />
                        <button
                          className={`icon-button favorite-button ${note.favorite ? "favorited" : ""}`}
                          title={
                            note.favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"
                          }
                          aria-label={
                            note.favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"
                          }
                          onClick={() =>
                            updateNote(note.id, { favorite: !note.favorite })
                          }
                        >
                          <Star
                            size={17}
                            fill={note.favorite ? "currentColor" : "none"}
                          />
                        </button>
                        <button
                          className="icon-button"
                          aria-label="메모 삭제"
                          title="메모 삭제"
                          onClick={() =>
                            setDeleteTarget({
                              type: "note",
                              noteId: note.id,
                              title: note.title,
                            })
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="note-title-area">
                      <span className="note-tag">
                        <span />
                        UNTITLED DREAMS / PERSONAL NOTE
                      </span>
                      <input
                        aria-label="메모 제목"
                        className="note-title"
                        placeholder="제목 없는 메모"
                        value={note.title}
                        onChange={(event) =>
                          updateNote(note.id, { title: event.target.value })
                        }
                      />
                      <div className="note-meta">
                        <span>{date(note.updatedAt)} 수정</span>
                        <i /> <span>{note.sections.length}개의 섹션</span>
                        <div className="paper-settings">
                          <span>배경</span>
                          {paperColors.map((color) => (
                            <button
                              key={color.value}
                              className={`paper-color ${note.background === color.value ? "selected" : ""}`}
                              style={{ backgroundColor: color.value }}
                              aria-label={`${color.label} 배경`}
                              title={`${color.label} 배경`}
                              aria-pressed={note.background === color.value}
                              onClick={() =>
                                updateNote(note.id, { background: color.value })
                              }
                            >
                              {note.background === color.value && (
                                <Check size={11} />
                              )}
                            </button>
                          ))}
                          <label
                            className="custom-color"
                            title="원하는 배경색 선택"
                          >
                            <Plus size={12} />
                            <input
                              type="color"
                              aria-label="사용자 지정 배경색"
                              value={note.background}
                              onChange={(event) =>
                                updateNote(note.id, {
                                  background: event.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                    <Toolbar
                      editor={
                        activeEditor && !activeEditor.isDestroyed
                          ? activeEditor
                          : null
                      }
                      onFolder={() => {
                        setFolderLabel("");
                        setFolderPath("");
                        setFolderError("");
                        setFolderModal(true);
                      }}
                    />
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
                            onChange={(patch) =>
                              updateSection(note.id, section.id, patch)
                            }
                            onFocus={(editor, sectionId) => {
                              setActiveEditor(editor);
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
                            onOpenFolder={(path) => void openFolder(path)}
                          />
                        ))}
                        {!note.sections.length && (
                          <div className="empty-sections">
                            <BookOpen size={30} />
                            <p>새 섹션에서 이야기를 시작해 보세요.</p>
                          </div>
                        )}
                        <button className="add-section" onClick={addSection}>
                          <Plus size={16} />
                          <span>새 섹션 추가</span>
                          <span className="add-section-hint">
                            생각을 나누면 더 선명해져요
                          </span>
                        </button>
                      </div>
                      <div className="paper-watermark">
                        <Leaf size={14} />
                        MAKE ROOM FOR YOUR THOUGHTS
                      </div>
                    </div>
                    <footer className="editor-footer">
                      <span>
                        <span className="status-dot" />
                        {native
                          ? "로컬에 저장되는 나만의 메모"
                          : "이 브라우저에 저장 · 백업으로 안전하게 보관하세요"}
                      </span>
                      <span>
                        {charCount.toLocaleString()}자
                        <span className="footer-divider">|</span>
                        {note.sections.length}개 섹션
                      </span>
                    </footer>
                  </>
                ) : (
                  <div className="editor-empty">
                    <span>
                      <FileText size={36} />
                    </span>
                    <h2>첫 번째 생각을 남겨볼까요?</h2>
                    <p>작은 기록부터, 이곳에 담아보세요.</p>
                    <button className="primary-button" onClick={addNote}>
                      <Plus size={16} />새 메모 만들기
                    </button>
                  </div>
                )}
              </section>
            </div>
            <footer className="workspace-footer">
              <span>MEMO OS / ALL YOUR LITTLE THOUGHTS ARE SAFE HERE.</span>
              <span>
                1.0.0 <span className="pixel-heart">♥</span> HAVE A NICE DAY!
              </span>
            </footer>
          </main>
        </div>
      </div>
      <div className="desktop-taskbar">
        <button
          className="start-button"
          onClick={() => {
            setFilter("all");
            setSearch("");
          }}
        >
          <img src="./pixel-memo.svg" alt="" />
          시작
        </button>
        <span className="taskbar-separator" />
        <button
          className="taskbar-app"
          onClick={() => setExpanded((value) => !value)}
        >
          <img src="./pixel-memo.svg" alt="" />
          MEMO.exe
        </button>
        <span className="taskbar-message">
          ✧ your thoughts are loading into something good.
        </span>
        <div className="taskbar-clock">
          <span className="pixel-heart">♥</span>
          <time dateTime={clock.toISOString()}>
            {clock.toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </time>
        </div>
      </div>
      {saveState === "error" && saveError && (
        <div className="storage-warning" role="alert">
          {saveError} <button onClick={exportBackup}>메모 백업</button>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{notice}</span>
          <button aria-label="알림 닫기" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {deleteTarget && (
        <Modal
          title={
            deleteTarget.type === "note"
              ? "메모를 삭제할까요?"
              : "섹션을 삭제할까요?"
          }
          onClose={() => setDeleteTarget(null)}
        >
          <div className="delete-illustration">
            <Trash2 size={26} />
          </div>
          <p className="modal-description">
            <strong>‘{deleteTarget.title || "제목 없음"}’</strong>
            {deleteTarget.type === "note"
              ? " 메모와 안의 모든 섹션이 삭제됩니다."
              : " 섹션과 안의 내용이 삭제됩니다."}
            <br />
            삭제한 내용은 되돌릴 수 없어요.
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
      {folderModal && (
        <Modal
          title="폴더 바로가기 만들기"
          onClose={() => setFolderModal(false)}
        >
          <div className="folder-illustration">
            <FolderOpen size={28} />
          </div>
          <p className="modal-description">
            자주 쓰는 폴더를 메모 속 버튼으로 연결해 두세요.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              addFolder();
            }}
          >
            <label className="field-label" htmlFor="folder-label">
              버튼 이름
            </label>
            <input
              autoFocus
              id="folder-label"
              className="form-input"
              placeholder="예: 지재권폴더"
              maxLength={80}
              value={folderLabel}
              onChange={(event) => setFolderLabel(event.target.value)}
            />
            <label className="field-label" htmlFor="folder-path">
              폴더 경로
            </label>
            <div className="folder-path-field">
              <input
                id="folder-path"
                className="form-input"
                placeholder={"C:\\Users\\이름\\Documents\\지재권"}
                value={folderPath}
                onChange={(event) => setFolderPath(event.target.value)}
              />
              <button
                className="secondary-button"
                type="button"
                onClick={() => void chooseFolder()}
                disabled={!native}
                title={
                  native
                    ? "탐색기에서 폴더 선택"
                    : "Windows 앱에서 폴더를 선택할 수 있어요"
                }
              >
                <Folder size={16} />
                찾아보기
              </button>
            </div>
            <p className="field-hint">
              {native
                ? "버튼을 클릭하면 Windows 탐색기에서 폴더가 열립니다."
                : "브라우저에서는 경로를 저장할 수 있어요. 폴더 열기는 Windows 앱에서 동작합니다."}
            </p>
            {folderError && (
              <p className="field-error" role="alert">
                {folderError}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setFolderModal(false)}
              >
                취소
              </button>
              <button type="submit" className="primary-button">
                <Plus size={16} />
                버튼 추가
              </button>
            </div>
          </form>
        </Modal>
      )}
      {importData && (
        <Modal
          title="백업 메모를 가져올까요?"
          onClose={() => setImportData(null)}
        >
          <p className="modal-description">
            백업에 있는 <strong>{importData.notes.length}개 메모</strong>를
            추가합니다.
            <br />
            기존 메모는 그대로 보관돼요. 같은 백업을 다시 가져오면 메모가 중복될
            수 있어요.
          </p>
          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => setImportData(null)}
            >
              취소
            </button>
            <button className="primary-button" onClick={restoreBackup}>
              가져오기
            </button>
          </div>
        </Modal>
      )}
      {guide && (
        <Modal
          title="나만의 기록을 만드는 방법"
          onClose={() => setGuide(false)}
          className="guide-modal"
        >
          <div className="guide-intro">
            <span className="brand-symbol">
              <Leaf size={23} />
            </span>
            <p>
              작은 생각을 기록하는
              <br />
              <strong>가장 편안한 공간, MEMO.</strong>
            </p>
          </div>
          <div className="guide-steps">
            <div>
              <b>01</b>
              <p>
                <strong>내 취향대로 꾸미기</strong>
                <span>
                  본문을 선택하고 글꼴, 크기, 굵게, 기울임, 밑줄, 글씨색과
                  강조색을 바꿔보세요. 배경색은 메모별로 설정할 수 있어요.
                </span>
              </p>
            </div>
            <div>
              <b>02</b>
              <p>
                <strong>섹션으로 나누어 정리하기</strong>
                <span>
                  섹션 제목과 내용은 각각 편집할 수 있어요. 메모나 섹션을 지울
                  때는 확인창이 먼저 나타납니다.
                </span>
              </p>
            </div>
            <div>
              <b>03</b>
              <p>
                <strong>폴더와 바로 연결하기</strong>
                <span>
                  Windows 앱에서 ‘폴더 연결’을 눌러 버튼 이름과 경로를
                  설정하세요. 버튼을 클릭하면 탐색기가 열려요. 본문에서 버튼을
                  선택하고 Delete 키로 제거할 수 있어요.
                </span>
              </p>
            </div>
            <div>
              <b>04</b>
              <p>
                <strong>언제나 눈앞에, 안전하게</strong>
                <span>
                  Windows 앱에서 ‘항상 위에’를 켜면 다른 창 위에 유지됩니다.
                  메모와 창 고정 설정은 다시 실행해도 유지돼요. 기기 간 자동
                  동기화는 없으니 백업 파일로 옮겨주세요.
                </span>
              </p>
            </div>
          </div>
          <div className="guide-tip">
            <ShieldCheck size={17} />
            <span>
              {native
                ? "메모는 내 컴퓨터에 저장됩니다. 주기적으로 백업해 주세요."
                : "메모는 이 브라우저에 저장됩니다. 브라우저 데이터를 지우기 전에 꼭 백업해 주세요."}
            </span>
          </div>
          <button
            className="primary-button guide-close"
            onClick={() => setGuide(false)}
          >
            기록하러 가기
            <ChevronRight size={15} />
          </button>
        </Modal>
      )}
    </div>
  );
}
