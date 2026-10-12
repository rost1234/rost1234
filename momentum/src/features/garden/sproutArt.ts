import type { GrowthStage, SproutMood } from '@/domain/garden';

/**
 * The sprout drawn as plain shapes in a 100×100 box, so the same art renders in React Native
 * (`Sprout.tsx`) and in tests. A pot with a face at the bottom, the plant above it.
 */
export type Shape =
  | { kind: 'path'; d: string; fill?: string; stroke?: string; strokeWidth?: number }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill: string }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; fill: string }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx: number; fill: string };

export const ART = {
  stem: '#2E8B57',
  leaf: '#4CAF6A',
  leafLight: '#7BD08A',
  pot: '#E9825A',
  potRim: '#F29A74',
  soil: '#7A4E33',
  seed: '#C08A4E',
  ink: '#3A281E',
  cheek: '#FFB59A',
  petal: '#F7B731',
  petalPink: '#F28DB2',
  center: '#A8431A',
  bud: '#E9825A',
  wing: '#9FD3F2',
  shine: '#FFF8EE',
} as const;

const n = (v: number) => Math.round(v * 10) / 10;

/** A leaf from its base to its tip; `width` is how far the sides bulge. */
function leaf(bx: number, by: number, tx: number, ty: number, width: number, fill: string = ART.leaf): Shape {
  const dx = tx - bx;
  const dy = ty - by;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * width;
  const ny = (dx / len) * width;
  const mx = (bx + tx) / 2;
  const my = (by + ty) / 2;
  return {
    kind: 'path',
    d: `M${n(bx)} ${n(by)}Q${n(mx + nx)} ${n(my + ny)} ${n(tx)} ${n(ty)}Q${n(mx - nx)} ${n(my - ny)} ${n(bx)} ${n(by)}Z`,
    fill,
  };
}

function stem(d: string, width = 4.5): Shape {
  return { kind: 'path', d, stroke: ART.stem, strokeWidth: width, fill: 'none' };
}

/** A round flower: `count` petals around a center. */
function flower(cx: number, cy: number, size: number, petal: string = ART.petal, count = 6): Shape[] {
  const petals: Shape[] = [];
  for (let i = 0; i < count; i += 1) {
    const a = (Math.PI * 2 * i) / count - Math.PI / 2;
    petals.push({ kind: 'circle', cx: n(cx + Math.cos(a) * size * 1.25), cy: n(cy + Math.sin(a) * size * 1.25), r: size, fill: petal });
  }
  return [...petals, { kind: 'circle', cx, cy, r: n(size * 0.85), fill: ART.center }];
}

/** A four-point sparkle. */
function sparkle(x: number, y: number, s: number): Shape {
  return { kind: 'path', d: `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`, fill: ART.petal };
}

const BIG_PAIR = [leaf(50, 45, 27, 37, 9), leaf(50, 44, 74, 35, 9, ART.leafLight)];
const MID_PAIR = [leaf(50, 34, 34, 24, 7, ART.leafLight), leaf(50, 33, 67, 22, 7)];

function plant(stage: GrowthStage): Shape[] {
  switch (stage) {
    case 0:
      return [
        { kind: 'path', d: 'M32 52Q50 41 68 52Z', fill: ART.soil },
        { kind: 'ellipse', cx: 50, cy: 46.5, rx: 5, ry: 3.6, fill: ART.seed },
        { kind: 'path', d: 'M48 45.5Q50 44 52 45.5', stroke: ART.soil, strokeWidth: 1.2, fill: 'none' },
      ];
    case 1:
      return [stem('M50 52Q49 47 50 42', 4), leaf(50, 43, 40, 37, 4.5, ART.leafLight), leaf(50, 43, 60, 36, 4.5)];
    case 2:
      return [stem('M50 52Q48 44 50 36'), leaf(50, 38, 29, 27, 8.5), leaf(50, 37, 73, 23, 8.5, ART.leafLight)];
    case 3:
      return [
        stem('M50 52Q48 40 50 27'),
        leaf(50, 44, 30, 35, 7.5),
        leaf(50, 43, 71, 33, 7.5, ART.leafLight),
        leaf(50, 29, 41, 20, 5, ART.leafLight),
        leaf(50, 28, 60, 18, 5),
      ];
    case 4:
      return [stem('M50 52Q48 36 50 19'), ...BIG_PAIR, ...MID_PAIR, leaf(50, 21, 45, 12, 3.5), leaf(50, 21, 56, 11, 3.5, ART.leafLight)];
    case 5:
      return [
        stem('M50 52Q48 34 50 18'),
        ...BIG_PAIR,
        ...MID_PAIR,
        leaf(50, 20, 44, 13, 3.5),
        leaf(50, 20, 56, 13, 3.5),
        { kind: 'ellipse', cx: 50, cy: 11, rx: 5, ry: 7.5, fill: ART.bud },
        { kind: 'path', d: 'M50 4.5Q47 10 50 17', stroke: ART.potRim, strokeWidth: 1.4, fill: 'none' },
      ];
    case 6:
      return [stem('M50 52Q48 34 50 16'), ...BIG_PAIR, ...MID_PAIR, ...flower(50, 12, 4.6)];
    case 7:
    case 8: {
      const bloom: Shape[] = [
        stem('M50 52Q48 34 50 16'),
        stem('M50 41Q39 36 31 26', 3.2),
        stem('M50 37Q61 31 69 21', 3.2),
        leaf(50, 47, 28, 41, 8),
        leaf(50, 46, 72, 40, 8, ART.leafLight),
        leaf(42, 37, 36, 29, 3.5, ART.leafLight),
        leaf(58, 33, 64, 25, 3.5),
        ...flower(50, 12, 4.6),
        ...flower(30, 23, 3.2, ART.petalPink, 5),
        ...flower(70, 18, 3.2, ART.petalPink, 5),
      ];
      if (stage === 7) return bloom;
      return [
        stem('M33 52Q30 47 25 41', 2.6),
        stem('M67 52Q70 47 75 42', 2.6),
        leaf(30, 48, 22, 46, 2.6),
        leaf(70, 48, 78, 47, 2.6, ART.leafLight),
        ...flower(25, 39, 2.6, ART.petal, 5),
        ...flower(75, 40, 2.6, ART.petal, 5),
        ...bloom,
        // A small butterfly visiting.
        { kind: 'ellipse', cx: 83, cy: 14, rx: 4.5, ry: 3, fill: ART.wing },
        { kind: 'ellipse', cx: 90, cy: 14, rx: 4.5, ry: 3, fill: ART.wing },
        { kind: 'path', d: 'M86.5 10V18', stroke: ART.stem, strokeWidth: 1.6, fill: 'none' },
      ];
    }
  }
}

/** Living details: eyes shut for a blink, the mouth open mid-word. */
export interface FaceState {
  blink?: boolean;
  mouthOpen?: boolean;
}

function face(mood: SproutMood, state: FaceState = {}): Shape[] {
  const line = (d: string, w = 2.8): Shape => ({ kind: 'path', d, stroke: ART.ink, strokeWidth: w, fill: 'none' });
  const cheeks: Shape[] = [
    { kind: 'circle', cx: 35, cy: 79, r: 4, fill: ART.cheek },
    { kind: 'circle', cx: 65, cy: 79, r: 4, fill: ART.cheek },
  ];
  const openEyes: Shape[] = [
    { kind: 'circle', cx: 41, cy: 73, r: 3.4, fill: ART.ink },
    { kind: 'circle', cx: 59, cy: 73, r: 3.4, fill: ART.ink },
    // A tiny shine makes the eyes look alive.
    { kind: 'circle', cx: 42.2, cy: 71.8, r: 1.1, fill: ART.shine },
    { kind: 'circle', cx: 60.2, cy: 71.8, r: 1.1, fill: ART.shine },
  ];
  const shut: Shape[] = [line('M37.5 73.5H44.5', 2.6), line('M55.5 73.5H62.5', 2.6)];
  const eyes = state.blink ? shut : openEyes;
  // Talking: a small round open mouth instead of the smile.
  const talking: Shape = { kind: 'ellipse', cx: 50, cy: 82, rx: 4.2, ry: 3.6, fill: ART.ink };
  switch (mood) {
    case 'calm':
      return [...eyes, state.mouthOpen ? talking : line('M45 81Q50 85 55 81')];
    case 'happy':
      return [...cheeks, ...eyes, state.mouthOpen ? talking : line('M42 80Q50 88 58 80')];
    case 'joy':
      return [
        ...cheeks,
        line('M36.5 74.5Q41 68.5 45.5 74.5', 3),
        line('M54.5 74.5Q59 68.5 63.5 74.5', 3),
        state.mouthOpen ? { ...talking, ry: 5 } : { kind: 'path', d: 'M42.5 79.5Q50 92 57.5 79.5Z', fill: ART.ink },
      ];
    case 'sleepy':
      return [...cheeks, line('M37 72Q41 76 45 72'), line('M55 72Q59 76 63 72'), state.mouthOpen ? { ...talking, rx: 3, ry: 2.6 } : line('M46 82Q50 84.5 54 82', 2.4)];
  }
}

/** Every shape of the sprout, back to front. */
export function sproutShapes(stage: GrowthStage, mood: SproutMood, withFace = true, state: FaceState = {}): Shape[] {
  const pot: Shape[] = [
    { kind: 'path', d: 'M24 56H76L70 90Q69 94 64 94H36Q31 94 30 90Z', fill: ART.pot },
    { kind: 'rect', x: 20, y: 50, width: 60, height: 12, rx: 6, fill: ART.potRim },
    { kind: 'ellipse', cx: 50, cy: 51.5, rx: 25, ry: 2.6, fill: ART.soil },
  ];
  const sparkles = withFace && mood === 'joy' ? [sparkle(13, 30, 5), sparkle(88, 40, 4), sparkle(16, 60, 3.2)] : [];
  return [...pot, ...plant(stage), ...(withFace ? face(mood, state) : []), ...sparkles];
}
