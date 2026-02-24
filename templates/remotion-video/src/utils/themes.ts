import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface Theme {
  primary: string;
  bg: string;
  accent: string;
  fg: string;
  bgSecondary?: string;
  bgTertiary?: string;
}

/**
 * Default themes matching ~/design-assets/color-palettes/ files.
 * These are used as fallbacks if the JSON files cannot be read at build time.
 */
export const themes: Record<string, Theme> = {
  wad: {
    primary: '#7C3AED',
    bg: '#09090B',
    accent: '#EC4899',
    fg: '#FFFFFF',
    bgSecondary: '#18181B',
    bgTertiary: '#27272A',
  },
  bloghead: {
    primary: '#3B82F6',
    bg: '#0F172A',
    accent: '#F59E0B',
    fg: '#FFFFFF',
    bgSecondary: '#1E293B',
    bgTertiary: '#334155',
  },
  ea: {
    primary: '#8B5CF6',
    bg: '#0A0A1A',
    accent: '#EC4899',
    fg: '#FFFFFF',
    bgSecondary: '#1E293B',
    bgTertiary: '#334155',
  },
};

/**
 * Maps theme file names in ~/design-assets/color-palettes/ to theme IDs.
 */
const themeFiles: Record<string, string> = {
  wad: 'wad-dark-theme.json',
  bloghead: 'bloghead-theme.json',
  ea: 'ea-solutions-theme.json',
};

/**
 * Attempt to load a theme from the design asset JSON files.
 * Falls back to the hardcoded defaults if the file cannot be read.
 *
 * @param themeId - One of 'wad', 'bloghead', 'ea'
 * @returns Theme object with primary, bg, accent, and fg colors
 */
export function loadTheme(themeId: string): Theme {
  const fallback = themes[themeId];

  if (!fallback) {
    console.warn(`Unknown theme "${themeId}". Available: ${Object.keys(themes).join(', ')}. Falling back to "wad".`);
    return themes.wad;
  }

  const fileName = themeFiles[themeId];
  if (!fileName) {
    return fallback;
  }

  const palettesDir = join(homedir(), 'design-assets', 'color-palettes');
  const filePath = join(palettesDir, fileName);

  if (!existsSync(filePath)) {
    return fallback;
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const colors = data.colors;

    return {
      primary: colors?.brand?.primary ?? fallback.primary,
      bg: colors?.background?.dark ?? colors?.background?.primary ?? fallback.bg,
      accent: colors?.brand?.secondary ?? fallback.accent,
      fg: colors?.text?.primary ?? colors?.text?.inverse ?? fallback.fg,
      bgSecondary: colors?.background?.secondary ?? fallback.bgSecondary,
      bgTertiary: colors?.background?.tertiary ?? fallback.bgTertiary,
    };
  } catch {
    console.warn(`Failed to parse theme file: ${filePath}. Using defaults.`);
    return fallback;
  }
}

/**
 * Get all available theme IDs.
 */
export function getAvailableThemes(): string[] {
  return Object.keys(themes);
}

/**
 * Resolve a theme from user input. Accepts a theme ID string or a partial
 * theme object. Missing fields are filled from the WAD default.
 */
export function resolveTheme(input: string | Partial<Theme> | undefined): Theme {
  if (!input) {
    return themes.wad;
  }

  if (typeof input === 'string') {
    return loadTheme(input);
  }

  return {
    primary: input.primary ?? themes.wad.primary,
    bg: input.bg ?? themes.wad.bg,
    accent: input.accent ?? themes.wad.accent,
    fg: input.fg ?? themes.wad.fg,
    bgSecondary: input.bgSecondary ?? themes.wad.bgSecondary,
    bgTertiary: input.bgTertiary ?? themes.wad.bgTertiary,
  };
}
