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
      palette.favorites.length <= 32 &&
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
        borderColor: readableInk(background),
        boxShadow: "inset 1px 1px #ffffff80, inset -1px -1px #00000020",
      }
    : {};
}
export function mergePalettes(
  current: ColorPalettes,
  backup: ColorPalettes,
): ColorPalettes {
  const merge = (kind: ColorKind) => ({
    recent: [
      ...new Set([...backup[kind].recent, ...current[kind].recent]),
    ].slice(0, 12),
    favorites: [
      ...new Set([...current[kind].favorites, ...backup[kind].favorites]),
    ].slice(0, 32),
  });
  return { text: merge("text"), highlight: merge("highlight") };
}
