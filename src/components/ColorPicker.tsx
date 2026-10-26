import { useState } from "react";
import { Highlighter } from "lucide-react";
import { Modal } from "./Modal";
import { ColorFields } from "./ColorFields";
import { colorHex, type ColorKind } from "../lib/colors";
export function ColorPicker({
  kind,
  value,
  disabled,
  onSelect,
}: {
  kind: ColorKind;
  value: string;
  disabled: boolean;
  onSelect: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(
    colorHex(value, kind === "text" ? "#000000" : "#fff0ad"),
  );
  const name = kind === "text" ? "글씨색" : "강조색";
  const base =
    kind === "text"
      ? ["#000000", "#d93025", "#174ea6", "#188038", "#8430ce", "#ffffff"]
      : ["#fff0ad", "#ffff00", "#ffcce0", "#ccebc5", "#cae4ff", "#e7d7ff"];
  return (
    <>
      <button
        className="tool-button color-tool"
        aria-label={`${name} 선택`}
        title={`${name} · 공통 색 즐겨찾기`}
        disabled={disabled}
        onClick={() => {
          setPicked(colorHex(value, kind === "text" ? "#000000" : "#fff0ad"));
          setOpen(true);
        }}
      >
        {kind === "text" ? (
          <span style={{ borderColor: value }}>A</span>
        ) : (
          <>
            <Highlighter size={17} />
            <span className="highlight-line" style={{ background: value }} />
          </>
        )}
      </button>
      {open && (
        <Modal
          title={kind === "text" ? "글씨색" : "형광색"}
          onClose={() => setOpen(false)}
        >
          <ColorFields
            name={name}
            value={picked}
            base={base}
            onSelect={(color) => {
              setPicked(color);
              onSelect(color);
            }}
            onCommit={kind === "highlight" ? () => setOpen(false) : undefined}
          />
          {kind === "text" ? (
            <div className="modal-actions">
              <button className="primary-button" onClick={() => setOpen(false)}>
                완료
              </button>
            </div>
          ) : (
            <p className="field-hint">
              색을 선택하면 바로 적용되고 창이 닫힙니다.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
