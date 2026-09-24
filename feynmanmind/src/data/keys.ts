/** Query keys. Prefix-based so invalidating ['concepts'] hits every concept query. */
export const keys = {
  subjects: ['subjects'] as const,
  subject: (id: string) => ['subjects', id] as const,
  concepts: (subjectId: string) => ['concepts', 'bySubject', subjectId] as const,
  concept: (id: string) => ['concepts', id] as const,
  weakConcepts: ['concepts', 'weak'] as const,
  cards: (conceptId: string) => ['cards', 'byConcept', conceptId] as const,
  card: (id: string) => ['cards', id] as const,
  sessions: (conceptId: string) => ['sessions', 'byConcept', conceptId] as const,
  session: (id: string) => ['sessions', id] as const,
  due: (conceptId?: string) => ['due', conceptId ?? 'all'] as const,
  stats: ['stats'] as const,
};
