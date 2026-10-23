import { Node, mergeAttributes } from "@tiptap/core";
export const FolderButton = Node.create<{ onOpen: (path: string) => void }>({
  name: "folderButton",
  inline: true,
  group: "inline",
  atom: true,
  selectable: true,
  addOptions() {
    return { onOpen: () => {} };
  },
  addAttributes() {
    return { label: { default: "폴더 열기" }, path: { default: "" } };
  },
  parseHTML() {
    return [
      {
        tag: "span[data-folder-button]",
        getAttrs: (element) => ({
          label:
            (element as HTMLElement).getAttribute("data-label") || "폴더 열기",
          path: (element as HTMLElement).getAttribute("data-path") || "",
        }),
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-folder-button": "",
        "data-label": node.attrs.label,
        "data-path": node.attrs.path,
        class: "folder-inline",
      }),
      `▱ ${node.attrs.label}`,
    ];
  },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("button");
      dom.type = "button";
      dom.className = "folder-inline";
      dom.contentEditable = "false";
      dom.textContent = `▱ ${node.attrs.label}`;
      dom.title = node.attrs.path;
      dom.addEventListener("click", (event) => {
        event.preventDefault();
        this.options.onOpen(node.attrs.path);
      });
      return { dom };
    };
  },
});
