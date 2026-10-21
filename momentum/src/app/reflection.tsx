import { ReflectionScreen } from '@/features/reflection/ReflectionScreen';

/** The lock lives inside: writing a new reflection never asks; reading a saved one does. */
export default function ReflectionRoute() {
  return <ReflectionScreen />;
}
