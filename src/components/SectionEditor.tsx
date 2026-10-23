import { useEffect, useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { Trash2 } from "lucide-react";
import { FolderButton } from "./FolderButton";
import { CopyButton } from "./CopyButton";
import type { CopyAction, Section } from "../lib/model";
interface Props {
  section: Section;
  index: number;
  active: boolean;
  onChange: (patch: Partial<Section>) => void;
  onFocus: (editor: Editor, id: string) => void;
  onDelete: () => void;
  onOpenFolder: (path: string) => void;
  onCopy: (action: CopyAction) => void;
}
export function SectionEditor({
  section,
  index,
  active,
  onChange,
  onFocus,
  onDelete,
  onOpenFolder,
  onCopy,
}: Props) {
  const callbacks = useRef({ onChange, onFocus, onOpenFolder, onCopy });
  callbacks.current = { onChange, onFocus, onOpenFolder, onCopy };
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      TextStyleKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      CopyButton.configure({
        onCopy: (action) => callbacks.current.onCopy(action),
      }),
      FolderButton.configure({
        onOpen: (path) => callbacks.current.onOpenFolder(path),
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
    <article className={`section ${active ? "section-active" : ""}`}>
      <div className="section-heading">
        <input
          className="section-title"
          aria-label={`섹션 ${index + 1} 제목`}
          value={section.title}
          placeholder="섹션 제목"
          onChange={(event) => onChange({ title: event.target.value })}
        />
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
