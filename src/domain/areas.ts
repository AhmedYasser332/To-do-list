export interface AreaColorChoice {
  id: string;
  name: string;
  hex: string;
}

export const AREA_PALETTE: AreaColorChoice[] = [
  { id: 'steel-blue', name: 'Steel Blue', hex: '#3B6D9E' },
  { id: 'sage-green', name: 'Sage Green', hex: '#4A7C59' },
  { id: 'warm-amber', name: 'Warm Amber', hex: '#C68B45' },
  { id: 'muted-coral', name: 'Muted Coral', hex: '#C46859' },
  { id: 'slate', name: 'Slate Gray', hex: '#64748B' },
  { id: 'olive', name: 'Olive Green', hex: '#606C38' },
  { id: 'terracotta', name: 'Terracotta', hex: '#A85A48' },
  { id: 'indigo', name: 'Muted Indigo', hex: '#4F5D75' },
];

/**
 * Returns a valid color string (hex) given an Area's color_token.
 * Defaults to the standard steel accent.
 */
export function getAreaColor(colorToken?: string | null): string {
  if (!colorToken) return '#3B6D9E';
  const found = AREA_PALETTE.find((c) => c.id === colorToken);
  if (found) return found.hex;
  if (colorToken.startsWith('#')) return colorToken;
  return '#3B6D9E';
}
