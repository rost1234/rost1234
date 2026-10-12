import { useId, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/Text';
import { useTheme } from '@/theme';

/**
 * Hand-drawn shapes for the notebook looks: a pen line on paper, a stroke of
 * chalk on the board. Everything is seeded, so a shape is the same on every
 * render (no jitter while scrolling), and different shapes wobble differently.
 */

/** A stable number per component instance, so each hand-drawn outline wobbles its own way. */
export function useSeed(): number {
  const id = useId();
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Small deterministic PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => n.toFixed(1);

/** A wobbly rounded rectangle that starts a little past a corner and overshoots where it began, like a quick pen stroke. */
export function roughRectPath(w: number, h: number, seed: number, inset: number, r: number, wobble: number): string {
  const rand = rng(seed);
  const j = () => (rand() - 0.5) * 2 * wobble;
  const x0 = inset, y0 = inset, x1 = w - inset, y1 = h - inset;
  const rr = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
  const seg = (ax: number, ay: number, bx: number, by: number) => {
    // A long side as two gentle curves with a wandering midpoint.
    const mx = (ax + bx) / 2 + j(), my = (ay + by) / 2 + j();
    return `Q ${f((ax + mx) / 2 + j())} ${f((ay + my) / 2 + j())} ${f(mx)} ${f(my)} Q ${f((mx + bx) / 2 + j())} ${f((my + by) / 2 + j())} ${f(bx)} ${f(by)}`;
  };
  const start = { x: x0 + rr + 6 + j(), y: y0 + j() };
  return [
    `M ${f(start.x)} ${f(start.y)}`,
    seg(start.x, start.y, x1 - rr, y0 + j()),
    `Q ${f(x1 + j() * 0.5)} ${f(y0 + j() * 0.5)} ${f(x1 + j())} ${f(y0 + rr)}`,
    seg(x1 + j(), y0 + rr, x1 + j(), y1 - rr),
    `Q ${f(x1 + j() * 0.5)} ${f(y1 + j() * 0.5)} ${f(x1 - rr)} ${f(y1 + j())}`,
    seg(x1 - rr, y1 + j(), x0 + rr, y1 + j()),
    `Q ${f(x0 + j() * 0.5)} ${f(y1 + j() * 0.5)} ${f(x0 + j())} ${f(y1 - rr)}`,
    seg(x0 + j(), y1 - rr, x0 + j(), y0 + rr),
    `Q ${f(x0 + j() * 0.5)} ${f(y0 + j() * 0.5)} ${f(x0 + rr)} ${f(y0 + j())}`,
    // Overshoot past the starting point.
    `L ${f(start.x + 14 + j())} ${f(start.y + j() * 0.6)}`,
  ].join(' ');
}

/** A wobbly circle with a small overshoot. */
export function roughCirclePath(size: number, seed: number, inset: number, wobble: number): string {
  const rand = rng(seed);
  const c = size / 2, r = size / 2 - inset;
  const steps = 14;
  const startAngle = rand() * Math.PI * 2;
  const pts = Array.from({ length: steps + 2 }, (_, i) => {
    const a = startAngle + (i / steps) * Math.PI * 2;
    const rad = r + (rand() - 0.5) * 2 * wobble;
    return { x: c + Math.cos(a) * rad, y: c + Math.sin(a) * rad };
  });
  let d = `M ${f(pts[0]!.x)} ${f(pts[0]!.y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i]!, q = pts[i + 1]!;
    d += ` Q ${f(p.x)} ${f(p.y)} ${f((p.x + q.x) / 2)} ${f((p.y + q.y) / 2)}`;
  }
  return d;
}

/** Stroke settings per look: one firm pen line on paper; a grainy double stroke of chalk on the board. */
function useStroke(width?: number) {
  const { look } = useTheme();
  const chalk = look === 'chalk';
  return {
    chalk,
    width: width ?? (chalk ? 2.4 : 1.4),
    // Chalk skips on the board's grain: tiny gaps in the line.
    dash: chalk ? '18 1.6 7 1.2 11 2' : undefined,
    wobble: chalk ? 1.6 : 1.1,
  };
}

/**
 * A hand-drawn frame around its parent (put it inside a view with
 * `position: relative`, which is the default). Measures the parent and draws
 * to its edges; it doesn't take touches.
 */
export function SketchBorder({ color, seed = 1, radius = 12, width, dashed }: { color: string; seed?: number; radius?: number; width?: number; dashed?: boolean }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const stroke = useStroke(width);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (!size || Math.abs(size.w - w) > 0.5 || Math.abs(size.h - h) > 0.5) setSize({ w, h });
  };
  const inset = stroke.width + 1.5;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {size && size.w > 10 && size.h > 10 ? (
        <Svg width={size.w} height={size.h}>
          <Path
            d={roughRectPath(size.w, size.h, seed, inset, radius, stroke.wobble)}
            stroke={color}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={dashed ? '9 7' : stroke.dash}
            fill="none"
            opacity={stroke.chalk ? 0.92 : 1}
          />
          {/* A second, fainter pass: chalk is never a single clean line; ink bleeds a little. */}
          <Path
            d={roughRectPath(size.w, size.h, seed + 97, inset + 0.6, radius, stroke.wobble * 1.3)}
            stroke={color}
            strokeWidth={stroke.width * 0.6}
            strokeLinecap="round"
            strokeDasharray={dashed ? '9 7' : stroke.dash}
            fill="none"
            opacity={stroke.chalk ? 0.4 : 0.25}
          />
        </Svg>
      ) : null}
    </View>
  );
}

/** A hand-drawn circle of a fixed size, optionally filled (a done station on the map). */
export function SketchCircle({ size, color, fill, seed = 1, width }: { size: number; color: string; fill?: string; seed?: number; width?: number }) {
  const stroke = useStroke(width ?? 3);
  const inset = stroke.width + 2;
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
      {fill ? <Path d={roughCirclePath(size, seed + 5, inset + 1, stroke.wobble * 0.6)} fill={fill} stroke="none" /> : null}
      <Path d={roughCirclePath(size, seed, inset, stroke.wobble * 1.4)} stroke={color} strokeWidth={stroke.width} strokeLinecap="round" fill="none" strokeDasharray={stroke.dash} />
      <Path d={roughCirclePath(size, seed + 31, inset + 1, stroke.wobble * 1.8)} stroke={color} strokeWidth={stroke.width * 0.5} strokeLinecap="round" fill="none" opacity={0.45} />
    </Svg>
  );
}

/** A wavy hand-drawn underline that fills the width it's given. */
export function Squiggle({ color, height = 8, seed = 3, style }: { color: string; height?: number; seed?: number; style?: StyleProp<ViewStyle> }) {
  const [w, setW] = useState(0);
  const stroke = useStroke(2);
  const rand = rng(seed);
  let d = '';
  if (w > 0) {
    const period = 16;
    d = `M 2 ${f(height / 2)}`;
    for (let x = 2; x < w - 2; x += period) {
      const amp = height / 2 - 1.5 + (rand() - 0.5);
      d += ` q ${f(period / 4)} ${f(-amp)} ${f(period / 2)} 0 q ${f(period / 4)} ${f(amp)} ${f(period / 2)} 0`;
    }
  }
  return (
    <View style={[{ height, alignSelf: 'stretch' }, style]} onLayout={(e) => setW(e.nativeEvent.layout.width)} pointerEvents="none">
      {w > 0 ? (
        <Svg width={w} height={height}>
          <Path d={d} stroke={color} strokeWidth={stroke.width} fill="none" strokeLinecap="round" strokeDasharray={stroke.dash} opacity={stroke.chalk ? 0.9 : 0.8} />
        </Svg>
      ) : null}
    </View>
  );
}

/** A checkmark drawn in one quick stroke (pen ink on paper, pink chalk on the board). */
export function SketchCheck({ size = 22, color }: { size?: number; color: string }) {
  const stroke = useStroke(size / 8);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3.5 12.5 C 5.5 14, 7.5 16.5, 9 19.5 C 12 12.5, 16 7, 21.5 2.5" stroke={color} strokeWidth={stroke.width * (24 / size) * 1.1} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/**
 * A rubber stamp (paper: double red border, slightly rotated and faded) or a
 * chalk label (board: yellow outline). In the classic look, a plain pill.
 */
export function Stamp({ children, tilt = -8, style }: { children: ReactNode; tilt?: number; style?: StyleProp<ViewStyle> }) {
  const { colors, look, fonts } = useTheme();
  if (look === 'classic') {
    return (
      <View style={[{ backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' }, style]}>
        <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 12 }}>{children}</Text>
      </View>
    );
  }
  const chalk = look === 'chalk';
  const ink = chalk ? colors.primary : 'rgba(163,48,31,0.82)';
  return (
    <View style={[{ alignSelf: 'flex-start', transform: [{ rotate: `${tilt}deg` }], padding: 2 }, style]}>
      <View style={{ borderWidth: chalk ? 0 : 2.5, borderColor: ink, padding: chalk ? 0 : 2 }}>
        <View style={{ borderWidth: chalk ? 0 : 1, borderColor: ink, paddingHorizontal: 10, paddingVertical: chalk ? 2 : 3 }}>
          {chalk ? <SketchBorder color={ink} seed={tiltSeed(tilt)} radius={8} /> : null}
          <Text
            style={
              chalk
                ? { fontFamily: fonts.hand, fontWeight: '700', fontSize: 24, lineHeight: 28, color: ink }
                : { fontFamily: fonts.body, fontWeight: '800', fontSize: 13, letterSpacing: 1, color: ink }
            }
          >
            {children}
          </Text>
        </View>
      </View>
    </View>
  );
}
const tiltSeed = (tilt: number) => Math.round(Math.abs(tilt) * 13) + 7;
