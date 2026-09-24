import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { IconName } from '@/components/ui';
import { useStudyStats } from '@/data/study';
import { useT, type TranslationKey } from '@/i18n';
import { useTheme } from '@/theme';

const TABS: readonly { name: string; title: TranslationKey; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'tabs.today', icon: 'sunny-outline', iconActive: 'sunny' },
  { name: 'library', title: 'tabs.library', icon: 'library-outline', iconActive: 'library' },
  { name: 'review', title: 'tabs.review', icon: 'albums-outline', iconActive: 'albums' },
  { name: 'settings', title: 'tabs.settings', icon: 'settings-outline', iconActive: 'settings' },
];

export default function TabsLayout() {
  const t = useT();
  const { colors } = useTheme();
  const dueNow = useStudyStats().data?.due_now ?? 0;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.title),
            headerShown: tab.name !== 'index',
            tabBarBadge: tab.name === 'review' && dueNow > 0 ? (dueNow > 99 ? '99+' : dueNow) : undefined,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
