import { useEffect, useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { TableKit } from "@tiptap/extension-table";
import { ParagraphSpacing } from "./ParagraphSpacing";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { Trash2, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { FolderButton } from "./FolderButton";
import { CopyButton } from "./CopyButton";
import type { Action, CopyAction, Section } from "../lib/model";
interface Props {
  section: Section;
  index: number;
  noteId: string;
  total: number;
  onReorder: (sourceId: string) => void;
  onMove: (offset: number) => void;
  active: boolean;
  onChange: (patch: Partial<Section>) => void;
  onFocus: (editor: Editor, id: string) => void;
  onDelete: () => void;
  onOpenFolder: (path: string) => void;
  onCopy: (action: CopyAction) => void;
  onEditInline: (action: Action, editor: Editor, position: number) => void;
}
export function SectionEditor({
  section,
  index,
  noteId,
  total,
  onReorder,
  onMove,
  active,
  onChange,
  onFocus,
  onDelete,
  onOpenFolder,
  onCopy,
  onEditInline,
}: Props) {
  const callbacks = useRef({
    onChange,
    onFocus,
    onOpenFolder,
    onCopy,
    onEditInline,
  });
  callbacks.current = { onChange, onFocus, onOpenFolder, onCopy, onEditInline };
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      TextStyleKit,
      ParagraphSpacing,
      TableKit.configure({ table: { resizable: true, cellMinWidth: 45 } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      CopyButton.configure({
        onCopy: (action) => callbacks.current.onCopy(action),
        onEdit: (action, editor, position) =>
          callbacks.current.onEditInline(action, editor, position),
      }),
      FolderButton.configure({
        onOpen: (path) => callbacks.current.onOpenFolder(path),
        onEdit: (action, editor, position) =>
          callbacks.current.onEditInline(action, editor, position),
      }),
    ],
    content: section.content,
    editorProps: {
      attributes: {
        "aria-label": `${section.title || "이름 없는 섹션"} 내용`,
        role: "textbox",
        "aria-multiline": "true",
        "data-placeholder": "메모 입력…",
      },
    },
    onUpdate: ({ editor }) =>
      callbacks.current.onChange({ content: editor.getHTML() }),
    onFocus: ({ editor }) => callbacks.current.onFocus(editor, section.id),
  });
  useEffect(() => {
    if (editor && index === 0) callbacks.current.onFocus(editor, section.id);
  }, [editor, section.id, index]);
  useEffect(() => {
    editor?.setOptions({
      editorProps: {
        attributes: {
          "aria-label": `${section.title || "이름 없는 섹션"} 내용`,
          role: "textbox",
          "aria-multiline": "true",
          "data-placeholder": "메모 입력…",
        },
      },
    });
  }, [editor, section.title]);
  return (
    <article
      className={`section ${active ? "section-active" : ""}`}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("application/x-memo-section")) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes("application/x-memo-section"))
          return;
        event.preventDefault();
        try {
          const payload = JSON.parse(
            event.dataTransfer.getData("application/x-memo-section"),
          );
          if (
            payload.noteId === noteId &&
            typeof payload.sectionId === "string"
          )
            onReorder(payload.sectionId);
        } catch {}
      }}
    >
      <div className="section-heading">
        <button
          className="icon-button drag-handle"
          draggable
          aria-label={`${section.title || `섹션 ${index + 1}`} 섹션 끌어서 이동`}
          title="끌어서 순서 변경"
          onDragStart={(event) => {
            event.dataTransfer.setData(
              "application/x-memo-section",
              JSON.stringify({ noteId, sectionId: section.id }),
            );
            event.dataTransfer.effectAllowed = "move";
          }}
        >
          <GripVertical size={14} />
        </button>
        <input
          className="section-title"
          aria-label={`섹션 ${index + 1} 제목`}
          value={section.title}
          placeholder="섹션 제목"
          onChange={(event) => onChange({ title: event.target.value })}
        />
        <button
          className="icon-button section-move"
          aria-label={`${section.title || `섹션 ${index + 1}`} 섹션 위로 이동`}
          disabled={index === 0}
          title="위로 이동"
          onClick={() => onMove(-1)}
        >
          <ArrowUp size={13} />
        </button>
        <button
          className="icon-button section-move"
          aria-label={`${section.title || `섹션 ${index + 1}`} 섹션 아래로 이동`}
          disabled={index === total - 1}
          title="아래로 이동"
          onClick={() => onMove(1)}
        >
          <ArrowDown size={13} />
        </button>
        <button
          className="icon-button section-delete"
          title="섹션 삭제"
          aria-label={`${section.title || "이름 없는 섹션"} 섹션 삭제`}
          onClick={onDelete}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <EditorContent editor={editor} />
    </article>
  );
}
