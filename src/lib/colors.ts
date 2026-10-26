import type { CSSProperties } from "react";
export type ColorKind = "text" | "highlight";
export interface ColorPalette {
  recent: string[];
  favorites: string[];
}
export interface ColorPalettes {
  text: ColorPalette;
  highlight: ColorPalette;
}
export const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
export const emptyPalettes = (): ColorPalettes => ({
  text: { recent: [], favorites: [] },
  highlight: { recent: [], favorites: [] },
});
export function validPalettes(value: unknown): value is ColorPalettes {
  if (!value || typeof value !== "object") return false;
  const palettes = value as ColorPalettes;
  return (["text", "highlight"] as const).every((kind) => {
    const palette = palettes[kind];
    return (
      palette &&
      Array.isArray(palette.recent) &&
      palette.recent.length <= 12 &&
      palette.recent.every(isHexColor) &&
      Array.isArray(palette.favorites) &&
      palette.favorites.length <= 64 &&
      palette.favorites.every(isHexColor)
    );
  });
}
export function colorHex(value: string, fallback = "#000000"): string {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  const rgb = value.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  return rgb
    ? "#" +
        rgb
          .slice(1, 4)
          .map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0"))
          .join("")
    : fallback;
}
export function readableInk(background: string): string {
  const channels = [1, 3, 5].map((i) => {
    const n = parseInt(background.slice(i, i + 2), 16) / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 >
    0.179
    ? "#000000"
    : "#ffffff";
}
export function shortcutStyle(background?: string | null): CSSProperties {
  return isHexColor(background)
    ? {
        backgroundColor: background,
        color: readableInk(background),
        borderColor: "var(--ui-line, #000000)",
        boxShadow: "none",
      }
    : {};
}
// Keep the version-one shape readable by older backups while sharing one palette.
export function sharedPalette(palettes: ColorPalettes): ColorPalette {
  const unique = (colors: string[]) => [
    ...new Set(colors.map((c) => c.toLowerCase())),
  ];
  return {
    recent: unique([
      ...palettes.text.recent,
      ...palettes.highlight.recent,
    ]).slice(0, 12),
    favorites: unique([
      ...palettes.text.favorites,
      ...palettes.highlight.favorites,
    ]).slice(0, 64),
  };
}
export function mergePalettes(
  current: ColorPalettes,
  backup: ColorPalettes,
): ColorPalettes {
  const a = sharedPalette(current),
    b = sharedPalette(backup);
  const shared = {
    recent: [...new Set([...b.recent, ...a.recent])].slice(0, 12),
    favorites: [...new Set([...a.favorites, ...b.favorites])].slice(0, 64),
  };
  return { text: shared, highlight: shared };
}
