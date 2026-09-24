import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Card, ErrorState, LoadingState, Screen, SectionHeader } from '@/components/ui';
import { useSession } from '@/data/sessions';
import { EvaluationView } from '@/features/feynman/EvaluationView';
import { useT } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';
import { useTheme } from '@/theme';

/** A past Feynman attempt: what the learner wrote and the tutor's feedback. */
export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useT();
  const { typography } = useTheme();
  const session = useSession(id);

  if (session.isPending) return <LoadingState />;
  if (session.isError) return <ErrorState message={errorMessage(session.error, t)} onRetry={() => void session.refetch()} />;
  const s = session.data;

  return (
    <Screen>
      <Text style={typography.caption}>{formatDateTime(s.created_at, t)}</Text>
      {s.comprehension_score !== null ? (
        <EvaluationView
          data={{
            comprehension_score: s.comprehension_score,
            socratic_question: s.socratic_question,
            jargon_detected: s.jargon_detected,
            misconceptions: s.misconceptions,
          }}
        />
      ) : null}
      <SectionHeader title={t('explain.youSaid')} />
      <Card>
        <Text style={typography.body} selectable>
          {s.user_explanation}
        </Text>
      </Card>
    </Screen>
  );
}
