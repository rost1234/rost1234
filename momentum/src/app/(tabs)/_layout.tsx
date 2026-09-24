import { Redirect } from 'expo-router';
import TopTabs from 'expo-router/js-top-tabs';
import { useQuickActionRouting } from 'expo-quick-actions/router';
import { SwipeTabBar, type TabItem } from '@/components/SwipeTabBar';
import { useTheme } from '@/components/theme';
import { handleQuickAction } from '@/services/quickActions';
import { useSettingsStore } from '@/state/settingsStore';

const TABS: readonly TabItem[] = [
  { name: 'index', title: 'tabs.today', icon: 'sunny-outline', iconActive: 'sunny' },
  { name: 'focus', title: 'tabs.focus', icon: 'timer-outline', iconActive: 'timer' },
  { name: 'analytics', title: 'tabs.insights', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
  { name: 'settings', title: 'tabs.settings', icon: 'settings-outline', iconActive: 'settings' },
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
  const { colors } = useTheme();
  // App-icon shortcuts; handled here (not in the root layout) so navigation is ready.
  useQuickActionRouting((action) => (isOnboarded ? handleQuickAction(action) : true));
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
            dark={activeName === 'focus'}
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
        <TopTabs.Screen key={tab.name} name={tab.name} />
      ))}
    </TopTabs>
  );
}
