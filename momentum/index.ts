import 'expo-router/entry';
import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from '@/widget/widgetTaskHandler';
import { registerHabitActionTask } from '@/services/notificationTask';
import { loadDayStart } from '@/services/dayStart';

// When the app's day starts (03:00 by default), read before anything asks for "today".
void loadDayStart();

// The home-screen widget runs headless JS, so its handler is registered at the
// entry point (before any screen mounts).
if (Platform.OS === 'android') {
  registerWidgetTaskHandler(widgetTaskHandler);
}

// "Done ✓" on a notification is handled headless too, so it works with the app closed.
registerHabitActionTask();
