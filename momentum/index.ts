import 'expo-router/entry';
import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from '@/widget/widgetTaskHandler';

// The home-screen widget runs headless JS, so its handler is registered at the
// entry point (before any screen mounts).
if (Platform.OS === 'android') {
  registerWidgetTaskHandler(widgetTaskHandler);
}
