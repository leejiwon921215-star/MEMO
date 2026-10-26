import { readableInk } from "./colors";
import type { CSSProperties } from "react";

export const DEFAULT_HEADER_COLOR = "#eeeeee";
export const HEADER_COLORS = [
  { color: DEFAULT_HEADER_COLOR, name: "기본 회색" },
  { color: "#e8d9ec", name: "연보라" },
  { color: "#d6e6f4", name: "하늘색" },
  { color: "#f2d9dc", name: "분홍" },
  { color: "#f3e6bf", name: "크림" },
  { color: "#ededed", name: "회색" },
  { color: "#ffffff", name: "흰색" },
  { color: "#303642", name: "진회색" },
];

export function headerTheme(color: string): CSSProperties {
  const rgb = [1, 3, 5].map((offset) =>
    parseInt(color.slice(offset, offset + 2), 16),
  );
  const mix = (target: number, ratio: number) =>
    "#" +
    rgb
      .map((channel) =>
        Math.round(channel * (1 - ratio) + target * ratio)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  const ink = (hex: string) => {
    const linear = [1, 3, 5].map((offset) => {
      const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722 > 0.179
      ? "#000000"
      : "#ffffff";
  };
  const subtle = mix(255, 0.18);
  const button = mix(255, 0.32);
  return {
    "--header-bg": color,
    "--header-ink": ink(color),
    "--header-subtle": subtle,
    "--header-subtle-ink": ink(subtle),
    "--header-button-bg": button,
    "--header-button-ink": ink(button),
    "--header-line": "var(--ui-line, #000000)",
    "--header-highlight": mix(255, 0.65),
  } as CSSProperties;
}

export interface Appearance {
  headerColor: string;
  surfaceColor?: string;
  inkColor?: string;
  lineColor?: string;
}
export function uiTheme(appearance?: Appearance): CSSProperties {
  const surface = appearance?.surfaceColor || "#f5f5f5";
  const ink = appearance?.inkColor || readableInk(surface);
  return {
    "--ui-bg": surface,
    "--ui-ink": ink,
    "--ui-line": appearance?.lineColor || "#000000",
    "--ui-selected": surface === "#f5f5f5" ? "#dddddd" : surface,
  } as CSSProperties;
}
