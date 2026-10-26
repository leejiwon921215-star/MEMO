import { Extension } from "@tiptap/core";
export const ParagraphSpacing = Extension.create({
  name: "paragraphSpacing",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el) =>
              /^(1|1\.2|1\.5|1\.8|2|2\.5|3)$/.test(el.style.lineHeight)
                ? el.style.lineHeight
                : null,
            renderHTML: (attrs) =>
              attrs.lineHeight
                ? { style: `line-height: ${attrs.lineHeight}` }
                : {},
          },
          spaceBefore: {
            default: null,
            parseHTML: (el) => el.style.marginTop || null,
            renderHTML: (attrs) =>
              attrs.spaceBefore
                ? { style: `margin-top: ${attrs.spaceBefore}` }
                : {},
          },
          spaceAfter: {
            default: null,
            parseHTML: (el) => el.style.marginBottom || null,
            renderHTML: (attrs) =>
              attrs.spaceAfter
                ? { style: `margin-bottom: ${attrs.spaceAfter}` }
                : {},
          },
        },
      },
    ];
  },
});
