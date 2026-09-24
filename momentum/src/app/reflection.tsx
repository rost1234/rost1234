import { ReflectionLock } from '@/features/reflection/ReflectionLock';
import { ReflectionScreen } from '@/features/reflection/ReflectionScreen';

export default function ReflectionRoute() {
  return (
    <ReflectionLock>
      <ReflectionScreen />
    </ReflectionLock>
  );
}
