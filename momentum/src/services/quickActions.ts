import { Platform } from 'react-native';
import * as QuickActions from 'expo-quick-actions';
import { router } from 'expo-router';
import { runDetached } from '@/core/errors';
import { useFocusStore } from '@/state/focusStore';
import { t } from '@/i18n';

import { QUICK_FOCUS_MINUTES } from './quickActionConfig';

/** Long-press the app icon: the three things people most often open the app for. */
const ACTION = { focus: 'focus25', reflection: 'reflection', addTask: 'addTask' } as const;

/** (Re)registers the shortcuts; titles are translated, so call once the language is known. */
export async function registerQuickActions(): Promise<void> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
  try {
    await QuickActions.setItems([
      { id: ACTION.focus, title: t('quick.focus', { minutes: QUICK_FOCUS_MINUTES }), icon: Platform.OS === 'ios' ? 'play' : 'shortcut_focus' },
      { id: ACTION.reflection, title: t('quick.reflection'), icon: Platform.OS === 'ios' ? 'date' : 'shortcut_reflection' },
      { id: ACTION.addTask, title: t('quick.addTask'), icon: Platform.OS === 'ios' ? 'add' : 'shortcut_task' },
    ]);
  } catch {
    // Shortcuts are a convenience; the app works without them.
  }
}

function whenFocusHydrated(): Promise<void> {
  if (useFocusStore.getState().isHydrated) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useFocusStore.subscribe((state) => {
      if (!state.isHydrated) return;
      unsubscribe();
      resolve();
    });
  });
}

/** Starts a plain focus session unless one is already running. */
export async function startQuickFocus(): Promise<void> {
  await whenFocusHydrated();
  const focus = useFocusStore.getState();
  if (!focus.timer) await focus.start(QUICK_FOCUS_MINUTES, { habitId: null, taskId: null });
}

/** Handles a shortcut; returns true when it was one of ours. */
export function handleQuickAction(action: QuickActions.Action): boolean {
  switch (action.id) {
    case ACTION.focus:
      router.navigate('/focus');
      runDetached(startQuickFocus());
      return true;
    case ACTION.reflection:
      router.push('/reflection');
      return true;
    case ACTION.addTask:
      router.push('/task-new');
      return true;
    default:
      return false;
  }
}
