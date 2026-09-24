import { Redirect } from 'expo-router';
import { useSettingsStore } from '@/state/settingsStore';

/** Startup guard: first launch → onboarding wizard, otherwise → dashboard. */
export default function Index() {
  const isOnboarded = useSettingsStore((s) => s.settings?.isOnboardingCompleted ?? false);
  return <Redirect href={isOnboarded ? '/(main)' : '/onboarding'} />;
}
