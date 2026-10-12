import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { GrowthStage, SproutMood } from '@/domain/garden';
import { usePageShown } from '@/features/pager/pager';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { Sprout } from './Sprout';

interface LiveSproutProps {
  stage: GrowthStage;
  mood: SproutMood;
  size: number;
  /** Changes when a habit was just done: a hop and a beaming face for a moment. */
  cheerKey?: number;
  /** Changes when the sprout starts a new line: the mouth moves for a moment. */
  talkKey?: number | string;
  /** Changes when the sprout was tapped: a little wiggle. */
  pokeKey?: number;
  /** Hop once as soon as it appears (celebrations). */
  cheerOnMount?: boolean;
}

const BLINK_MS = 130;
const CHEER_MS = 1800;
const FLAPS = 6;
const FLAP_MS = 110;

/**
 * The sprout as a little living character: it breathes and sways gently, blinks now and then,
 * moves its mouth when it speaks, hops when a habit is done and wiggles when poked.
 * With "reduce motion" on, it stays still (the face still changes).
 */
export function LiveSprout({ stage, mood, size, cheerKey = 0, talkKey = 0, pokeKey = 0, cheerOnMount = false }: LiveSproutProps) {
  const reduce = useReduceMotion();
  // Still when it's off screen (Today swiped away in the pager).
  const shown = usePageShown('home');
  const still = reduce || !shown;
  const [breath] = useState(() => new Animated.Value(0));
  const [hop] = useState(() => new Animated.Value(0));
  const [wiggle] = useState(() => new Animated.Value(0));
  const [blink, setBlink] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [cheering, setCheering] = useState(false);
  const first = useRef({ cheer: cheerOnMount ? Number.NaN : cheerKey, talk: talkKey, poke: pokeKey });

  // Breathing and swaying while the screen is in front (stopped when it isn't, to save battery).
  useFocusEffect(
    useCallback(() => {
      if (still) return undefined;
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(breath, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(breath, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }, [breath, still]),
  );

  // Blinks every few seconds, at random, like a living face.
  useFocusEffect(
    useCallback(() => {
      if (still) return undefined;
      let timer: ReturnType<typeof setTimeout>;
      const next = () => {
        timer = setTimeout(
          () => {
            setBlink(true);
            timer = setTimeout(() => {
              setBlink(false);
              next();
            }, BLINK_MS);
          },
          2600 + Math.random() * 3200,
        );
      };
      next();
      return () => {
        clearTimeout(timer);
        setBlink(false);
      };
    }, [still]),
  );

  // A habit done: hop and beam.
  useEffect(() => {
    if (cheerKey === first.current.cheer) return;
    first.current.cheer = cheerKey;
    setCheering(true);
    const timer = setTimeout(() => setCheering(false), CHEER_MS);
    if (!reduce) {
      Animated.sequence([
        Animated.timing(hop, { toValue: -14, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(hop, { toValue: 0, friction: 3.5, tension: 160, useNativeDriver: true }),
      ]).start();
    }
    return () => clearTimeout(timer);
  }, [cheerKey, hop, reduce]);

  // A new line: the mouth opens and closes a few times.
  useEffect(() => {
    if (talkKey === first.current.talk) return;
    first.current.talk = talkKey;
    if (reduce) return;
    let flaps = 0;
    const interval = setInterval(() => {
      flaps += 1;
      setMouthOpen((open) => !open);
      if (flaps >= FLAPS) {
        clearInterval(interval);
        setMouthOpen(false);
      }
    }, FLAP_MS);
    return () => {
      clearInterval(interval);
      setMouthOpen(false);
    };
  }, [talkKey, reduce]);

  // Poked: a quick wiggle.
  useEffect(() => {
    if (pokeKey === first.current.poke) return;
    first.current.poke = pokeKey;
    if (reduce) return;
    wiggle.setValue(0);
    Animated.sequence([
      Animated.timing(wiggle, { toValue: 1, duration: 70, useNativeDriver: true }),
      Animated.timing(wiggle, { toValue: -1, duration: 110, useNativeDriver: true }),
      Animated.timing(wiggle, { toValue: 0.6, duration: 90, useNativeDriver: true }),
      Animated.timing(wiggle, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();
  }, [pokeKey, reduce, wiggle]);

  const scaleY = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const sway = Animated.add(
    breath.interpolate({ inputRange: [0, 1], outputRange: [-1.2, 1.2] }),
    wiggle.interpolate({ inputRange: [-1, 1], outputRange: [-7, 7] }),
  ).interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] });

  return (
    <Animated.View style={{ transformOrigin: 'bottom', transform: [{ translateY: hop }, { rotate: sway }, { scaleY }] }}>
      <Sprout stage={stage} mood={cheering && mood !== 'joy' ? 'joy' : mood} size={size} blink={blink && !cheering} mouthOpen={mouthOpen} />
    </Animated.View>
  );
}
