import { Onboarding } from '@/features/onboarding/Onboarding';
import { usePrefsStore } from '@/state/prefsStore';

export default function OnboardingRoute() {
  // Flipping the flag re-evaluates the root Stack.Protected guards.
  return <Onboarding onFinish={() => usePrefsStore.getState().set({ onboardingDone: true })} />;
}
