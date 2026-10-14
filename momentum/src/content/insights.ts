import rawInsights from './insights.json';
import type { Insight, SproutLines } from './insightSchema';

/** Every research card. Validated by src/content/__tests__/insights.test.ts. */
export const INSIGHTS = rawInsights as unknown as Insight[];

const BY_ID = new Map(INSIGHTS.map((insight) => [insight.id, insight]));

export const insightById = (id: string): Insight | undefined => BY_ID.get(id);

/** A card's finding and suggestion, as the sprout tells them (Garden) or as plain research text. */
export function insightLines(insight: Insight, he: boolean, sprout: boolean): SproutLines {
  const text = he ? insight.he : insight;
  return sprout ? text.sprout : { finding: text.finding, action: text.action };
}

/** Where a card comes from, in one short line: the institution (or authors) and the year. */
export function sourceShort(insight: Insight): string {
  return `${insight.source.institution ?? insight.source.authors} · ${insight.source.year}`;
}

/** The start of a card's first line ("I read a study from London…"): a teaser for one not told yet. */
export function teaserOf(finding: string): string {
  const colon = finding.indexOf(':');
  if (colon > 0 && colon <= 70) return `${finding.slice(0, colon)}…`;
  const words = finding.split(' ');
  return words.length > 7 ? `${words.slice(0, 7).join(' ')}…` : finding;
}
