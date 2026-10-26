import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type CSSProperties,
} from "react";
import { Star } from "lucide-react";
import { colorHex, readableInk, type ColorPalette } from "../lib/colors";

export const ColorsContext = createContext<{
  palette: ColorPalette;
  remember: (color: string) => void;
  favorite: (color: string) => void;
  theme: CSSProperties;
}>({
  palette: { recent: [], favorites: [] },
  remember: () => {},
  favorite: () => {},
  theme: {},
});

export function ColorFields({
  name,
  value,
  onSelect,
  base = ["#000000", "#ffffff", "#eeeeee", "#ffff00", "#ffcce0", "#cae4ff"],
  onCommit,
}: {
  name: string;
  value: string;
  onSelect: (color: string) => void;
  base?: string[];
  onCommit?: () => void;
}) {
  const { palette, remember, favorite } = useContext(ColorsContext);
  const picked = colorHex(value);
  const input = useRef<HTMLInputElement>(null);
  const select = (color: string, committed = true) => {
    onSelect(color);
    if (committed) {
      remember(color);
      onCommit?.();
    }
  };
  const selectRef = useRef(select);
  selectRef.current = select;
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    const commit = () => selectRef.current(el.value);
    el.addEventListener("change", commit);
    return () => el.removeEventListener("change", commit);
  }, []);
  const swatch = (color: string, group: string) => (
    <button
      type="button"
      key={color}
      aria-label={`${name} ${group} ${color}`}
      title={color}
      style={{ backgroundColor: color, color: readableInk(color) }}
      onClick={() => select(color)}
    >
      {picked === color ? "✓" : ""}
    </button>
  );
  return (
    <div className="color-fields" role="group" aria-label={`${name} 색상 설정`}>
      <div className="color-picker-current">
        <label>
          <span>{name}</span>
          <input
            ref={input}
            type="color"
            aria-label={name}
            value={picked}
            onChange={(event) => select(event.target.value, false)}
          />
        </label>
        <span>{picked.toUpperCase()}</span>
        <button
          type="button"
          className="icon-button"
          aria-label={`현재 ${name} 즐겨찾기`}
          aria-pressed={palette.favorites.includes(picked)}
          title="모든 색 설정에서 함께 쓰는 즐겨찾기"
          onClick={() => favorite(picked)}
        >
          <Star
            size={18}
            fill={palette.favorites.includes(picked) ? "currentColor" : "none"}
          />
        </button>
      </div>
      <p className="field-label">기본색</p>
      <div className="palette-swatches">
        {base.map((c) => swatch(c, "기본"))}
      </div>
      <p className="field-label">공통 즐겨찾기</p>
      <div className="palette-swatches">
        {palette.favorites.map((c) => swatch(c, "즐겨찾기"))}
        {!palette.favorites.length && (
          <span className="field-hint">
            별표를 누르면 모든 색 설정에서 함께 쓸 수 있습니다.
          </span>
        )}
      </div>
      <p className="field-label">최근 사용 색</p>
      <div className="recent-colors">
        {palette.recent.map((color) => (
          <div key={color}>
            {swatch(color, "최근")}
            <button
              type="button"
              className="icon-button"
              aria-label={`${color} ${name} 즐겨찾기`}
              aria-pressed={palette.favorites.includes(color)}
              onClick={() => favorite(color)}
            >
              <Star
                size={14}
                fill={
                  palette.favorites.includes(color) ? "currentColor" : "none"
                }
              />
            </button>
          </div>
        ))}
        {!palette.recent.length && (
          <span className="field-hint">선택한 색이 여기에 표시됩니다.</span>
        )}
      </div>
    </div>
  );
}
