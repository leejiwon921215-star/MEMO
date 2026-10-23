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
export interface MemoData {
  version: 1;
  notes: Note[];
  selectedId: string | null;
}
export type NativeResult = { ok: true } | { ok: false; error: string };
declare global {
  interface Window {
    memoDesktop?: {
      read: () => Promise<MemoData | null>;
      save: (data: MemoData) => Promise<NativeResult>;
      chooseFolder: () => Promise<string | null>;
      openFolder: (folder: string) => Promise<NativeResult>;
      getAlwaysOnTop: () => Promise<boolean>;
      setAlwaysOnTop: (enabled: boolean) => Promise<NativeResult>;
    };
  }
}
export const STORAGE_KEY = "memo-studio.v1";
export const id = () => crypto.randomUUID();
export function makeNote(): Note {
  return {
    id: id(),
    title: "제목 없는 메모",
    background: "#ffffff",
    favorite: false,
    updatedAt: new Date().toISOString(),
    sections: [{ id: id(), title: "첫 번째 섹션", content: "<p></p>" }],
  };
}
export function initialData(): MemoData {
  const now = new Date().toISOString();
  const notes: Note[] = [
    {
      id: id(),
      title: "나의 첫 번째 메모",
      background: "#ffffff",
      favorite: true,
      updatedAt: now,
      sections: [
        {
          id: id(),
          title: "생각이 머무는 곳",
          content:
            "<p>흩어져 있던 생각들을 이곳에 차곡차곡 담아보세요.</p><p>작은 아이디어부터 중요한 기록까지, <strong>나만의 방식으로</strong> 정리할 수 있어요.</p>",
        },
        {
          id: id(),
          title: "이렇게 시작해 보세요",
          content:
            "<p>✦ 글자를 선택한 뒤 서식 도구로 분위기를 바꿔보세요.</p><p>✦ 섹션을 나누면 긴 메모도 한눈에 정리돼요.</p><p>✦ 자주 쓰는 폴더는 버튼으로 연결해 두세요.</p>",
        },
      ],
    },
    {
      id: id(),
      title: "새로운 프로젝트 구상",
      background: "#fff9ed",
      favorite: false,
      updatedAt: now,
      sections: [
        {
          id: id(),
          title: "아이디어 스케치",
          content:
            "<p>아직 이름 붙이지 못한 아이디어도 괜찮아요.</p><p>떠오르는 것부터 자유롭게 적어보세요.</p>",
        },
      ],
    },
    {
      id: id(),
      title: "일상의 작은 기록",
      background: "#f1f6f0",
      favorite: false,
      updatedAt: now,
      sections: [
        {
          id: id(),
          title: "오늘의 한 조각",
          content: "<p>오늘은 어떤 순간을 오래 기억하고 싶나요?</p>",
        },
      ],
    },
  ];
  return { version: 1, notes, selectedId: notes[0].id };
}
export function isMemoData(value: unknown): value is MemoData {
  if (!value || typeof value !== "object") return false;
  const data = value as MemoData;
  const ids = new Set<string>();
  return (
    data.version === 1 &&
    (data.selectedId === null || typeof data.selectedId === "string") &&
    Array.isArray(data.notes) &&
    data.notes.length <= 10000 &&
    data.notes.every((note) => {
      if (!note || typeof note.id !== "string" || ids.has(note.id))
        return false;
      ids.add(note.id);
      return (
        typeof note.title === "string" &&
        typeof note.background === "string" &&
        /^#[0-9a-f]{6}$/i.test(note.background) &&
        typeof note.favorite === "boolean" &&
        typeof note.updatedAt === "string" &&
        Number.isFinite(Date.parse(note.updatedAt)) &&
        Array.isArray(note.sections) &&
        note.sections.every((section) => {
          if (!section || typeof section.id !== "string" || ids.has(section.id))
            return false;
          ids.add(section.id);
          return (
            typeof section.title === "string" &&
            typeof section.content === "string"
          );
        })
      );
    })
  );
}
export function plainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent?.replace(/\s+/g, " ").trim() || "";
}
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
  return data;
}
export async function saveData(data: MemoData) {
  if (window.memoDesktop) {
    const result = await window.memoDesktop.save(data);
    if (!result.ok) throw new Error(result.error);
  } else localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
