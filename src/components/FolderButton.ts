import { Node, mergeAttributes, type Editor } from "@tiptap/core";
import type { Action } from "../lib/model";
import { isHexColor, readableInk, shortcutStyle } from "../lib/colors";
export const FolderButton = Node.create<{
  onOpen: (path: string) => void;
  onEdit: (action: Action, editor: Editor, pos: number) => void;
}>({
  name: "folderButton",
  inline: true,
  group: "inline",
  atom: true,
  selectable: true,
  addOptions() {
    return { onOpen: () => {}, onEdit: () => {} };
  },
  addAttributes() {
    return {
      label: { default: "폴더 열기" },
      path: { default: "" },
      background: { default: null },
    };
  },
  parseHTML() {
    return [
      {
        tag: "span[data-folder-button]",
        getAttrs: (element) => {
          const el = element as HTMLElement;
          const bg = el.getAttribute("data-background");
          return {
            label: el.getAttribute("data-label") || "폴더 열기",
            path: el.getAttribute("data-path") || "",
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
        "data-folder-button": "",
        "data-label": node.attrs.label,
        "data-path": node.attrs.path,
        "data-background": isHexColor(bg) ? bg : null,
        class: "folder-inline",
        ...(isHexColor(bg)
          ? { style: `background-color:${bg};color:${readableInk(bg)}` }
          : {}),
      }),
      `▱ ${node.attrs.label}`,
    ];
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement("button");
      dom.type = "button";
      dom.className = "folder-inline";
      dom.contentEditable = "false";
      dom.textContent = `▱ ${node.attrs.label}`;
      dom.title = node.attrs.path + "\n오른쪽 클릭으로 수정";
      Object.assign(dom.style, shortcutStyle(node.attrs.background));
      dom.addEventListener("click", (event) => {
        event.preventDefault();
        this.options.onOpen(node.attrs.path);
      });
      dom.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        const pos = getPos();
        if (typeof pos === "number")
          this.options.onEdit(
            {
              type: "folder",
              label: node.attrs.label,
              path: node.attrs.path,
              ...(isHexColor(node.attrs.background)
                ? { background: node.attrs.background }
                : {}),
            },
            editor,
            pos,
          );
      });
      return { dom };
    };
  },
});
