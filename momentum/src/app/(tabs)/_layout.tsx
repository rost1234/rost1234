import { Redirect } from 'expo-router';
import TopTabs from 'expo-router/js-top-tabs';
import { SwipeTabBar, type TabItem } from '@/components/SwipeTabBar';
import { colors } from '@/components/theme';
import { useSettingsStore } from '@/state/settingsStore';

const TABS: readonly TabItem[] = [
  { name: 'index', title: 'Today', glyph: '◉' },
  { name: 'focus', title: 'Focus', glyph: '◷' },
  { name: 'analytics', title: 'Insights', glyph: '▦' },
  { name: 'settings', title: 'Settings', glyph: '⚙' },
];

interface TabBarRenderProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

/** Main sections as a swipeable pager: swipe left/right or tap the bar at the bottom. */
export default function TabsLayout() {
  const isOnboarded = useSettingsStore((s) => s.settings?.isOnboardingCompleted ?? false);
  if (!isOnboarded) return <Redirect href="/onboarding" />;

  return (
    <TopTabs
      tabBarPosition="bottom"
      screenOptions={{ swipeEnabled: true, sceneStyle: { backgroundColor: colors.background } }}
      tabBar={({ state, navigation }: TabBarRenderProps) => {
        const activeName = state.routes[state.index]?.name;
        return (
          <SwipeTabBar
            items={TABS}
            activeIndex={TABS.findIndex((t) => t.name === activeName)}
            onPress={(name, isFocused) => {
              const route = state.routes.find((r) => r.name === name);
              if (!route) return;
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(name);
            }}
          />
        );
      }}
    >
      {TABS.map((tab) => (
        <TopTabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
    </TopTabs>
  );
}
