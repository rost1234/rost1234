import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { Animated, BackHandler, Dimensions, Easing, I18nManager, PanResponder, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/components/theme';
import { AnalyticsScreen } from '@/features/analytics/AnalyticsScreen';
import { CalendarScreen } from '@/features/calendar/CalendarScreen';
import { DashboardScreen } from '@/features/dashboard/DashboardScreen';
import { FocusFab } from '@/features/dashboard/HomeChrome';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { MainTabs, TAB_BAR_SPACE } from './MainTabs';
import { PAGES, PagerContext, usePagerStore, type PageId } from './pager';

const SCREENS: Record<PageId, ComponentType> = {
  home: DashboardScreen,
  calendar: CalendarScreen,
  insights: AnalyticsScreen,
};

/** How far (share of the width) or how fast a swipe must go to turn the page. */
const TURN_SHARE = 0.22;
const TURN_SPEED = 0.45;

const FRAME = { embedded: true, bottomBar: TAB_BAR_SPACE };

/** Where the strip sits for a page: pages run along the reading direction (leftward in Hebrew). */
const sign = () => (I18nManager.isRTL ? -1 : 1);
const targetFor = (page: PageId) => -PAGES.indexOf(page) * Dimensions.get('window').width * sign();

/** The swipe: made once, reading the current page from the store (no React state inside). */
function makeResponder(offset: Animated.Value) {
  const settle = () => Animated.spring(offset, { toValue: targetFor(usePagerStore.getState().page), friction: 9, tension: 90, useNativeDriver: true }).start();
  return PanResponder.create({
    // Only clearly sideways moves; vertical scrolling and horizontal chip rows keep theirs.
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
    onPanResponderGrant: () => offset.stopAnimation(),
    onPanResponderMove: (_, g) => {
      const { page } = usePagerStore.getState();
      const current = PAGES.indexOf(page);
      // Toward a page that isn't there: resist.
      const forward = -g.dx * sign() > 0;
      const atEdge = (forward && current === PAGES.length - 1) || (!forward && current === 0);
      offset.setValue(targetFor(page) + (atEdge ? g.dx * 0.25 : g.dx));
    },
    onPanResponderRelease: (_, g) => {
      const { page, go } = usePagerStore.getState();
      const current = PAGES.indexOf(page);
      const width = Dimensions.get('window').width;
      const forward = -g.dx * sign();
      const speed = -g.vx * sign();
      let next = current;
      if (forward > width * TURN_SHARE || speed > TURN_SPEED) next = Math.min(PAGES.length - 1, current + 1);
      else if (forward < -width * TURN_SHARE || speed < -TURN_SPEED) next = Math.max(0, current - 1);
      const target = PAGES[next] ?? 'home';
      if (target === page) settle();
      else go(target);
    },
    onPanResponderTerminate: settle,
  });
}

/**
 * Today, the month and progress side by side: swipe between them (in reading
 * direction, so in Hebrew the next page comes from the left) or use the tab bar. A page is
 * built the first time it's visited and kept, so coming back is instant. Android's back
 * button returns to Today before leaving the app.
 */
export function MainPager() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const reduce = useReduceMotion();
  const page = usePagerStore((s) => s.page);
  const visited = usePagerStore((s) => s.visited);
  const [offset] = useState(() => new Animated.Value(0));
  const [responder] = useState(() => makeResponder(offset));
  const dir = sign();
  // Where each page sits: the shared swipe offset plus its own place along the reading direction.
  const shifts = useMemo(() => PAGES.map((_, i) => Animated.add(offset, i * width * dir)), [offset, width, dir]);

  // Keep the pager "on" while it's the screen in front, so links switch pages instead of opening sheets.
  useFocusEffect(
    useCallback(() => {
      usePagerStore.setState({ active: true });
      return () => usePagerStore.setState({ active: false });
    }, []),
  );

  // Android back: to Today first.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (usePagerStore.getState().page === 'home') return false;
        usePagerStore.getState().go('home');
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  // Turn to the current page (from a swipe, a tab or a link), and stay put when the width changes.
  useEffect(() => {
    const target = -PAGES.indexOf(page) * width * dir;
    if (reduce) {
      offset.setValue(target);
      return;
    }
    Animated.timing(offset, { toValue: target, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [page, width, dir, offset, reduce]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]} {...responder.panHandlers}>
      {PAGES.map((id, i) => {
        const Screen = SCREENS[id];
        const current = id === page;
        return (
          <Animated.View
            key={id}
            // Each page moves by itself, so the page in view really sits on the screen: Android
            // only hands scrolling to views inside their parent's bounds (a shifted strip of
            // pages left the Month and Progress lists unscrollable).
            style={[StyleSheet.absoluteFill, { width, transform: [{ translateX: shifts[i] ?? offset }] }]}
            // Only the page in view is read by screen readers and takes touches.
            importantForAccessibility={current ? 'auto' : 'no-hide-descendants'}
            accessibilityElementsHidden={!current}
            pointerEvents={current ? 'auto' : 'none'}
          >
            {visited.includes(id) ? (
              <PagerContext.Provider value={FRAME}>
                <Screen />
              </PagerContext.Provider>
            ) : null}
          </Animated.View>
        );
      })}
      <FocusFab />
      <MainTabs />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, overflow: 'hidden' } });
