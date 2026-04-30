export function hashNum(seed: string, min: number, max: number): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  }
  return min + ((Math.abs(h) % 1000) / 1000) * (max - min);
}

export function hashInt(seed: string, count: number): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % count;
}

export const PIN_COLORS = ["", "red", "brass", "black"] as const;
export type PinColor = (typeof PIN_COLORS)[number];

export const PIN_POSITIONS_TOP = ["tc", "tr", "tl"] as const;
export type PinPosition = (typeof PIN_POSITIONS_TOP)[number];
