import { Node, mergeAttributes } from "@tiptap/core";
import type { CopyAction } from "../lib/model";
export const CopyButton = Node.create<{ onCopy: (action: CopyAction) => void }>(
  {
    name: "copyButton",
    inline: true,
    group: "inline",
    atom: true,
    selectable: true,
    addOptions() {
      return { onCopy: () => {} };
    },
    addAttributes() {
      return {
        label: { default: "복사" },
        mode: { default: "text" },
        text: { default: "" },
        noteId: { default: "" },
      };
    },
    parseHTML() {
      return [
        {
          tag: "span[data-copy-button]",
          getAttrs: (element) => {
            const el = element as HTMLElement;
            return {
              label: el.getAttribute("data-label") || "복사",
              mode: el.getAttribute("data-mode") === "note" ? "note" : "text",
              text: el.getAttribute("data-text") || "",
              noteId: el.getAttribute("data-note-id") || "",
            };
          },
        },
      ];
    },
    renderHTML({ node, HTMLAttributes }) {
      return [
        "span",
        mergeAttributes(HTMLAttributes, {
          "data-copy-button": "",
          "data-label": node.attrs.label,
          "data-mode": node.attrs.mode,
          "data-text": node.attrs.text,
          "data-note-id": node.attrs.noteId,
          class: "copy-inline",
        }),
        `▣ ${node.attrs.label}`,
      ];
    },
    addNodeView() {
      return ({ node }) => {
        const dom = document.createElement("button");
        dom.type = "button";
        dom.className = "copy-inline";
        dom.contentEditable = "false";
        dom.textContent = `▣ ${node.attrs.label}`;
        dom.title = "클릭하여 복사";
        dom.addEventListener("click", (event) => {
          event.preventDefault();
          this.options.onCopy(
            node.attrs.mode === "note"
              ? {
                  type: "copy",
                  label: node.attrs.label,
                  mode: "note",
                  noteId: node.attrs.noteId,
                }
              : {
                  type: "copy",
                  label: node.attrs.label,
                  mode: "text",
                  text: node.attrs.text,
                },
          );
        });
        return { dom };
      };
    },
  },
);
