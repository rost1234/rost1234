import { memo } from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import type { GrowthStage, SproutMood } from '@/domain/garden';
import { sproutShapes, type FaceState } from './sproutArt';

interface SproutProps {
  stage: GrowthStage;
  mood?: SproutMood;
  size: number;
  /** Small pots on habit cards have no face. */
  face?: boolean;
  /** Eyes shut mid-blink, mouth open mid-word (see `LiveSprout`). */
  blink?: boolean;
  mouthOpen?: boolean;
}

/** The Garden look's sprout. Decorative: the screen around it says the same thing in words. */
function SproutComponent({ stage, mood = 'calm', size, face = true, blink = false, mouthOpen = false }: SproutProps) {
  const state: FaceState = { blink, mouthOpen };
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessible={false} importantForAccessibility="no-hide-descendants">
      {sproutShapes(stage, mood, face, state).map((s, i) => {
        switch (s.kind) {
          case 'path':
            return (
              <Path
                key={i}
                d={s.d}
                fill={s.fill ?? 'none'}
                stroke={s.stroke}
                strokeWidth={s.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          case 'circle':
            return <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} />;
          case 'ellipse':
            return <Ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={s.fill} />;
          case 'rect':
            return <Rect key={i} x={s.x} y={s.y} width={s.width} height={s.height} rx={s.rx} fill={s.fill} />;
        }
      })}
    </Svg>
  );
}

export const Sprout = memo(SproutComponent);
