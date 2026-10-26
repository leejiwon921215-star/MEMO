import { useEffect, useRef, useState } from "react";
import { Highlighter, Star } from "lucide-react";
import { Modal } from "./Modal";
import {
  colorHex,
  readableInk,
  type ColorKind,
  type ColorPalette,
} from "../lib/colors";
export function ColorPicker({
  kind,
  value,
  disabled,
  palette,
  onSelect,
  onFavorite,
}: {
  kind: ColorKind;
  value: string;
  disabled: boolean;
  palette: ColorPalette;
  onSelect: (color: string) => void;
  onFavorite: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(
    colorHex(value, kind === "text" ? "#000000" : "#fff0ad"),
  );
  const name = kind === "text" ? "글씨색" : "강조색";
  const colorInput = useRef<HTMLInputElement>(null);
  const select = (color: string, committed = true) => {
    setPicked(color);
    onSelect(color);
    if (kind === "highlight" && committed) setOpen(false);
  };
  const selectRef = useRef(select);
  selectRef.current = select;
  useEffect(() => {
    if (!open) return;
    const input = colorInput.current;
    if (!input) return;
    // Native color pickers emit input previews, then a change on commitment.
    // Keep previews live without closing the OS picker during a drag.
    const commit = () => selectRef.current(input.value, true);
    input.addEventListener("change", commit);
    return () => input.removeEventListener("change", commit);
  }, [open]);
  const base =
    kind === "text"
      ? ["#000000", "#d93025", "#174ea6", "#188038", "#8430ce", "#ffffff"]
      : ["#fff0ad", "#ffff00", "#ffcce0", "#ccebc5", "#cae4ff", "#e7d7ff"];
  return (
    <>
      <button
        className="tool-button color-tool"
        aria-label={`${name} 선택`}
        title={
          kind === "text"
            ? "글씨색 · 최근 색 · 즐겨찾기"
            : "형광색 · 최근 색 · 즐겨찾기"
        }
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
          <div className="color-picker-current">
            <label>
              <span>{name}</span>
              <input
                ref={colorInput}
                type="color"
                aria-label={name}
                value={picked}
                onChange={(event) => select(event.target.value, false)}
              />
            </label>
            <span>{picked.toUpperCase()}</span>
            <button
              className="icon-button"
              aria-label={`현재 ${name} 즐겨찾기`}
              aria-pressed={palette.favorites.includes(picked)}
              title="선택한 색 즐겨찾기"
              onClick={() => onFavorite(picked)}
            >
              <Star
                size={18}
                fill={
                  palette.favorites.includes(picked) ? "currentColor" : "none"
                }
              />
            </button>
          </div>
          <p className="field-label">기본색</p>
          <div className="palette-swatches">
            {base.map((color) => (
              <button
                key={color}
                aria-label={`${name} 기본 ${color}`}
                title={color}
                style={{ backgroundColor: color, color: readableInk(color) }}
                onClick={() => select(color)}
              >
                {picked === color ? "✓" : ""}
              </button>
            ))}
          </div>
          <p className="field-label">즐겨찾기</p>
          <div className="palette-swatches">
            {palette.favorites.map((color) => (
              <button
                key={color}
                aria-label={`${name} 즐겨찾기 ${color}`}
                title={color}
                style={{ backgroundColor: color, color: readableInk(color) }}
                onClick={() => select(color)}
              >
                {picked === color ? "✓" : ""}
              </button>
            ))}
            {!palette.favorites.length && (
              <span className="field-hint">별표를 눌러 색을 보관하세요.</span>
            )}
          </div>
          <p className="field-label">최근 사용 색</p>
          <div className="recent-colors">
            {palette.recent.map((color) => (
              <div key={color}>
                <button
                  className="recent-swatch"
                  aria-label={`${name} 최근 ${color}`}
                  title={color}
                  style={{ backgroundColor: color, color: readableInk(color) }}
                  onClick={() => select(color)}
                >
                  {picked === color ? "✓" : ""}
                </button>
                <button
                  className="icon-button"
                  aria-label={`${color} ${name} 즐겨찾기`}
                  aria-pressed={palette.favorites.includes(color)}
                  onClick={() => onFavorite(color)}
                >
                  <Star
                    size={14}
                    fill={
                      palette.favorites.includes(color)
                        ? "currentColor"
                        : "none"
                    }
                  />
                </button>
              </div>
            ))}
            {!palette.recent.length && (
              <span className="field-hint">선택한 색이 여기에 표시됩니다.</span>
            )}
          </div>
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
