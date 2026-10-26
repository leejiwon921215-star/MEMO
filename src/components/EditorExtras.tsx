import { useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { ListOrdered, Table2, Rows3 } from "lucide-react";
import { Modal } from "./Modal";
export function EditorExtras({ editor }: { editor: Editor | null }) {
  const [dialog, setDialog] = useState<
    "spacing" | "insert" | "row" | "column" | "table" | null
  >(null);
  const [height, setHeight] = useState("1.8");
  const [before, setBefore] = useState("0");
  const [after, setAfter] = useState("7");
  const [rows, setRows] = useState("3");
  const [columns, setColumns] = useState("3");
  const [header, setHeader] = useState(true);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            table: e.isActive("table"),
            attrs: e.getAttributes(
              e.isActive("heading") ? "heading" : "paragraph",
            ),
          }
        : null,
  });
  const run = (command: (e: Editor) => void) => {
    if (editor && !editor.isDestroyed) command(editor);
  };
  const showSpacing = () => {
    setHeight(state?.attrs.lineHeight || "1.8");
    setBefore(String(parseFloat(state?.attrs.spaceBefore || "0")));
    setAfter(String(parseFloat(state?.attrs.spaceAfter || "7")));
    setDialog("spacing");
  };
  return (
    <>
      <button
        className="tool-button"
        aria-label="줄 간격과 문단 여백"
        title="줄 간격 · 문단 위아래 여백"
        disabled={!editor}
        onClick={showSpacing}
      >
        <Rows3 size={17} />
      </button>
      <button
        className="tool-button"
        aria-label="표 삽입"
        title="표 삽입"
        disabled={!editor}
        onClick={() => setDialog("insert")}
      >
        <Table2 size={17} />
      </button>
      {state?.table && (
        <div className="table-tools" role="toolbar" aria-label="표 편집">
          <button
            onClick={() => run((e) => e.chain().focus().addRowAfter().run())}
          >
            행 추가
          </button>
          <button
            onClick={() => run((e) => e.chain().focus().addColumnAfter().run())}
          >
            열 추가
          </button>
          <button onClick={() => setDialog("row")}>행 삭제</button>
          <button onClick={() => setDialog("column")}>열 삭제</button>
          <button onClick={() => setDialog("table")}>표 삭제</button>
        </div>
      )}
      {dialog === "spacing" && (
        <Modal title="줄 간격과 문단 여백" onClose={() => setDialog(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const attrs = {
                lineHeight: height,
                spaceBefore: `${Number(before)}px`,
                spaceAfter: `${Number(after)}px`,
              };
              run((e) =>
                e
                  .chain()
                  .focus()
                  .updateAttributes("paragraph", attrs)
                  .updateAttributes("heading", attrs)
                  .run(),
              );
              setDialog(null);
            }}
          >
            <label className="field-label">
              줄 간격
              <select
                className="form-input"
                aria-label="줄 간격"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              >
                {["1", "1.2", "1.5", "1.8", "2", "2.5", "3"].map((value) => (
                  <option key={value} value={value}>
                    {value}배
                  </option>
                ))}
              </select>
            </label>
            <div className="spacing-fields">
              <label className="field-label">
                문단 위 여백 (px)
                <input
                  className="form-input"
                  aria-label="문단 위 여백"
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={before}
                  onChange={(e) => setBefore(e.target.value)}
                />
              </label>
              <label className="field-label">
                문단 아래 여백 (px)
                <input
                  className="form-input"
                  aria-label="문단 아래 여백"
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={after}
                  onChange={(e) => setAfter(e.target.value)}
                />
              </label>
            </div>
            <p className="field-hint">
              커서가 있는 문단 또는 선택한 문단에 적용됩니다.
            </p>
            <div className="modal-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setDialog(null)}
              >
                취소
              </button>
              <button className="primary-button" type="submit">
                적용
              </button>
            </div>
          </form>
        </Modal>
      )}
      {dialog === "insert" && (
        <Modal title="표 삽입" onClose={() => setDialog(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const r = Number(rows),
                c = Number(columns);
              if (
                !Number.isInteger(r) ||
                !Number.isInteger(c) ||
                r < 1 ||
                r > 20 ||
                c < 1 ||
                c > 12
              )
                return;
              run((e) =>
                e
                  .chain()
                  .focus()
                  .insertTable({ rows: r, cols: c, withHeaderRow: header })
                  .run(),
              );
              setDialog(null);
            }}
          >
            <div className="spacing-fields">
              <label className="field-label">
                행
                <input
                  className="form-input"
                  type="number"
                  aria-label="표 행 수"
                  min={1}
                  max={20}
                  required
                  value={rows}
                  onChange={(e) => setRows(e.target.value)}
                />
              </label>
              <label className="field-label">
                열
                <input
                  className="form-input"
                  type="number"
                  aria-label="표 열 수"
                  min={1}
                  max={12}
                  required
                  value={columns}
                  onChange={(e) => setColumns(e.target.value)}
                />
              </label>
            </div>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={header}
                onChange={(e) => setHeader(e.target.checked)}
              />
              첫 행을 제목 행으로
            </label>
            <div className="modal-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setDialog(null)}
              >
                취소
              </button>
              <button className="primary-button" type="submit">
                표 넣기
              </button>
            </div>
          </form>
        </Modal>
      )}
      {dialog && ["row", "column", "table"].includes(dialog) && (
        <Modal
          title={`${dialog === "row" ? "행을" : dialog === "column" ? "열을" : "표를"} 삭제할까요?`}
          onClose={() => setDialog(null)}
        >
          <p className="modal-description">선택한 부분의 내용이 삭제됩니다.</p>
          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => setDialog(null)}
            >
              취소
            </button>
            <button
              className="danger-button"
              onClick={() => {
                run((e) => {
                  const chain = e.chain().focus();
                  if (dialog === "row") chain.deleteRow().run();
                  else if (dialog === "column") chain.deleteColumn().run();
                  else chain.deleteTable().run();
                });
                setDialog(null);
              }}
            >
              삭제하기
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
