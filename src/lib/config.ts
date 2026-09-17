import type { IconSvgElement } from "@hugeicons/react";

export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export type Navlink = { label: string; href: string; icon?: IconSvgElement };
