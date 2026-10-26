import { Node, mergeAttributes, type Editor } from "@tiptap/core";
import type { CopyAction } from "../lib/model";
import { isHexColor, readableInk, shortcutStyle } from "../lib/colors";
export const CopyButton = Node.create<{
  onCopy: (action: CopyAction) => void;
  onEdit: (action: CopyAction, editor: Editor, pos: number) => void;
}>({
  name: "copyButton",
  inline: true,
  group: "inline",
  atom: true,
  selectable: true,
  addOptions() {
    return { onCopy: () => {}, onEdit: () => {} };
  },
  addAttributes() {
    return {
      label: { default: "복사" },
      mode: { default: "text" },
      text: { default: "" },
      noteId: { default: "" },
      background: { default: null },
    };
  },
  parseHTML() {
    return [
      {
        tag: "span[data-copy-button]",
        getAttrs: (element) => {
          const el = element as HTMLElement;
          const bg = el.getAttribute("data-background");
          return {
            label: el.getAttribute("data-label") || "복사",
            mode: el.getAttribute("data-mode") === "note" ? "note" : "text",
            text: el.getAttribute("data-text") || "",
            noteId: el.getAttribute("data-note-id") || "",
            background: isHexColor(bg) ? bg : null,
          };
        },
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    const bg = node.attrs.background;
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-copy-button": "",
        "data-label": node.attrs.label,
        "data-mode": node.attrs.mode,
        "data-text": node.attrs.text,
        "data-note-id": node.attrs.noteId,
        "data-background": isHexColor(bg) ? bg : null,
        class: "copy-inline",
        ...(isHexColor(bg)
          ? { style: `background-color:${bg};color:${readableInk(bg)}` }
          : {}),
      }),
      `▣ ${node.attrs.label}`,
    ];
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement("button");
      dom.type = "button";
      dom.className = "copy-inline";
      dom.contentEditable = "false";
      dom.textContent = `▣ ${node.attrs.label}`;
      dom.title = "클릭하여 복사 · 오른쪽 클릭으로 수정";
      Object.assign(dom.style, shortcutStyle(node.attrs.background));
      const action: CopyAction = {
        type: "copy",
        label: node.attrs.label,
        ...(node.attrs.mode === "note"
          ? { mode: "note", noteId: node.attrs.noteId }
          : { mode: "text", text: node.attrs.text }),
        ...(isHexColor(node.attrs.background)
          ? { background: node.attrs.background }
          : {}),
      };
      dom.addEventListener("click", (event) => {
        event.preventDefault();
        this.options.onCopy(action);
      });
      dom.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        const pos = getPos();
        if (typeof pos === "number") this.options.onEdit(action, editor, pos);
      });
      return { dom };
    };
  },
});
