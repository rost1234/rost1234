import { router } from 'expo-router';
import { Onboarding } from '@/features/onboarding/Onboarding';

export default function HowItWorks() {
  return <Onboarding onFinish={() => router.back()} />;
}
