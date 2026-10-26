import { ColorPicker } from "./ColorPicker";
import { EditorExtras } from "./EditorExtras";
import type { ColorKind, ColorPalettes } from "../lib/colors";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  PaintBucket,
  Highlighter,
  ChevronDown,
} from "lucide-react";
interface Props {
  editor: Editor | null;
  background: string;
  onBackground: (color: string) => void;
  palettes: ColorPalettes;
  onRememberColor: (kind: ColorKind, color: string) => void;
  onFavoriteColor: (kind: ColorKind, color: string) => void;
}
export function Toolbar({
  editor,
  background,
  onBackground,
  palettes,
  onRememberColor,
  onFavoriteColor,
}: Props) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            align:
              e.getAttributes("paragraph").textAlign ||
              e.getAttributes("heading").textAlign ||
              "left",
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            color: e.getAttributes("textStyle").color || "#000000",
            highlight:
              e.getAttributes("textStyle").backgroundColor || "#fff0ad",
            font: e.getAttributes("textStyle").fontFamily || "sans-serif",
            size: e.getAttributes("textStyle").fontSize || "16px",
          }
        : null,
  });
  const run = (command: (e: Editor) => void) => {
    if (editor && !editor.isDestroyed) command(editor);
  };
  return (
    <div
      className="toolbar"
      role="toolbar"
      aria-label="글 서식"
      onMouseDown={(event) => {
        if ((event.target as HTMLElement).closest("dialog")) return;
        if ((event.target as HTMLElement).closest("button"))
          event.preventDefault();
      }}
    >
      <div className="select-wrap font-select">
        <select
          aria-label="글꼴"
          disabled={!editor}
          value={state?.font || "sans-serif"}
          onChange={(e) =>
            run((editor) =>
              editor.chain().focus().setFontFamily(e.target.value).run(),
            )
          }
        >
          <option value="sans-serif">기본 고딕</option>
          <option value="NeoDunggeunmo">도트 글꼴</option>
          <option value="serif">바탕체</option>
          <option value="monospace">고정폭</option>
          <option value="Malgun Gothic, sans-serif">맑은 고딕</option>
          <option value="Gulim, sans-serif">굴림</option>
        </select>
        <ChevronDown size={12} />
      </div>
      <div className="select-wrap size-select">
        <select
          aria-label="글자 크기"
          disabled={!editor}
          value={state?.size || "16px"}
          onChange={(e) =>
            run((editor) =>
              editor.chain().focus().setFontSize(e.target.value).run(),
            )
          }
        >
          {[12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map((size) => (
            <option key={size} value={`${size}px`}>
              {size}
            </option>
          ))}
        </select>
        <ChevronDown size={12} />
      </div>
      <span className="toolbar-divider" />
      <button
        disabled={!editor}
        className={`tool-button ${state?.bold ? "is-active" : ""}`}
        title="굵게 (Ctrl+B)"
        aria-label="굵게"
        aria-pressed={!!state?.bold}
        onClick={() => run((e) => e.chain().focus().toggleBold().run())}
      >
        <Bold size={17} />
      </button>
      <button
        disabled={!editor}
        className={`tool-button ${state?.italic ? "is-active" : ""}`}
        title="기울임 (Ctrl+I)"
        aria-label="기울임"
        aria-pressed={!!state?.italic}
        onClick={() => run((e) => e.chain().focus().toggleItalic().run())}
      >
        <Italic size={17} />
      </button>
      <button
        disabled={!editor}
        className={`tool-button ${state?.underline ? "is-active" : ""}`}
        title="밑줄 (Ctrl+U)"
        aria-label="밑줄"
        aria-pressed={!!state?.underline}
        onClick={() => run((e) => e.chain().focus().toggleUnderline().run())}
      >
        <Underline size={17} />
      </button>
      <ColorPicker
        kind="text"
        value={state?.color || "#000000"}
        disabled={!editor}
        palette={palettes.text}
        onSelect={(color) => {
          run((e) => e.chain().focus().setColor(color).run());
          onRememberColor("text", color);
        }}
        onFavorite={(color) => onFavoriteColor("text", color)}
      />
      <ColorPicker
        kind="highlight"
        value={state?.highlight || "#fff0ad"}
        disabled={!editor}
        palette={palettes.highlight}
        onSelect={(color) => {
          run((e) => e.chain().focus().setBackgroundColor(color).run());
          onRememberColor("highlight", color);
        }}
        onFavorite={(color) => onFavoriteColor("highlight", color)}
      />
      <span className="toolbar-divider" />
      {(
        [
          { value: "left", label: "왼쪽 정렬", icon: AlignLeft },
          { value: "center", label: "가운데 정렬", icon: AlignCenter },
          { value: "right", label: "오른쪽 정렬", icon: AlignRight },
        ] as const
      ).map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          disabled={!editor}
          title={label}
          aria-label={label}
          aria-pressed={state?.align === value}
          className={`tool-button ${state?.align === value ? "is-active" : ""}`}
          onClick={() =>
            run((e) => e.chain().focus().setTextAlign(value).run())
          }
        >
          <Icon size={17} />
        </button>
      ))}
      <span className="toolbar-divider" />
      <button
        disabled={!editor}
        title="글머리 목록"
        aria-label="글머리 목록"
        aria-pressed={!!state?.bullet}
        className={`tool-button ${state?.bullet ? "is-active" : ""}`}
        onClick={() => run((e) => e.chain().focus().toggleBulletList().run())}
      >
        <List size={17} />
      </button>
      <button
        disabled={!editor}
        title="번호 목록"
        aria-label="번호 목록"
        aria-pressed={!!state?.ordered}
        className={`tool-button ${state?.ordered ? "is-active" : ""}`}
        onClick={() => run((e) => e.chain().focus().toggleOrderedList().run())}
      >
        <ListOrdered size={17} />
      </button>
      <div className="toolbar-spacer" />
      <button
        disabled={!editor}
        className="tool-button undo-button"
        title="실행 취소 (Ctrl+Z)"
        aria-label="실행 취소"
        onClick={() => run((e) => e.chain().focus().undo().run())}
      >
        <Undo2 size={17} />
      </button>
      <button
        disabled={!editor}
        className="tool-button undo-button"
        title="다시 실행 (Ctrl+Shift+Z)"
        aria-label="다시 실행"
        onClick={() => run((e) => e.chain().focus().redo().run())}
      >
        <Redo2 size={17} />
      </button>
      <span className="toolbar-divider" />
      <EditorExtras editor={editor} />
      <label className="tool-button color-tool" title="메모 배경색">
        <PaintBucket size={16} />
        <input
          type="color"
          aria-label="메모 배경색"
          value={background}
          onChange={(event) => onBackground(event.target.value)}
        />
      </label>
    </div>
  );
}
