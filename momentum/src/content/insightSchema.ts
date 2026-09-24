/**
 * Schema for research-backed insight cards (the future "one insight a day").
 * Content is produced by the `insight-researcher` agent and validated by
 * `__tests__/insights.test.ts`, so an unsourced or malformed card can't ship.
 */
import type { GoalId } from '@/domain/presets';

export const INSIGHT_CATEGORIES = ['habits', 'focus', 'sleep_energy', 'mood', 'social', 'motivation'] as const;
export type InsightCategory = (typeof INSIGHT_CATEGORIES)[number];

export const SOURCE_TYPES = ['meta_analysis', 'peer_reviewed', 'institutional_report', 'book'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

/** strong = meta-analysis / replicated; moderate = solid single studies; emerging = early or book-only. */
export const EVIDENCE_LEVELS = ['strong', 'moderate', 'emerging'] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

/** In-app moments where a card is especially relevant. */
export const INSIGHT_TRIGGERS = ['new_habit', 'streak_broken', 'perfect_week', 'low_mood', 'missed_focus'] as const;
export type InsightTrigger = (typeof INSIGHT_TRIGGERS)[number];

export interface InsightSource {
  type: SourceType;
  title: string;
  authors: string;
  year: number;
  /** University / research institute behind the work, when known. */
  institution?: string;
  /** Journal or publisher. */
  venue?: string;
  doi?: string;
  url: string;
}

export interface Insight {
  /** kebab-case, unique, stable forever (used to track which cards were shown). */
  id: string;
  category: InsightCategory;
  /** Onboarding goals this card fits; empty = everyone. */
  goals: GoalId[];
  /** One plain-language sentence, in our own words (no quotes from books). */
  finding: string;
  /** Optional headline number, e.g. { value: "66", label: "days on average to form a habit" }. */
  stat?: { value: string; label: string };
  /** One concrete thing to do today. */
  action: string;
  source: InsightSource;
  /** Bestselling book that popularized the idea, when the source is the underlying study. */
  popularizedBy?: { title: string; author: string };
  evidence: EvidenceLevel;
  /** Honest limits: sample, replication status, effect size. */
  caveat?: string;
  triggers: InsightTrigger[];
  /** YYYY-MM-DD the source was last checked. */
  verifiedOn: string;
}

export const LIMITS = { finding: 200, action: 140, statLabel: 60, caveat: 200 } as const;

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const GOALS: readonly GoalId[] = ['focus', 'health', 'mindset'];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v);

/** Returns a list of problems (empty = valid). */
export function validateInsights(data: unknown): string[] {
  if (!Array.isArray(data)) return ['insights.json must be an array'];
  const errors: string[] = [];
  const ids = new Set<string>();
  const currentYear = new Date().getFullYear();

  data.forEach((raw, i) => {
    const at = (msg: string) => errors.push(`#${i}${isRecord(raw) && nonEmpty(raw.id) ? ` (${raw.id})` : ''}: ${msg}`);
    if (!isRecord(raw)) return at('not an object');

    if (!nonEmpty(raw.id) || !KEBAB.test(raw.id)) at('id must be kebab-case');
    else if (ids.has(raw.id)) at('duplicate id');
    else ids.add(raw.id);

    if (!oneOf(INSIGHT_CATEGORIES, raw.category)) at('invalid category');
    if (!Array.isArray(raw.goals) || !raw.goals.every((g) => oneOf(GOALS, g))) at('goals must be a list of focus/health/mindset');
    if (!nonEmpty(raw.finding) || raw.finding.length > LIMITS.finding) at(`finding is required, max ${LIMITS.finding} chars`);
    if (!nonEmpty(raw.action) || raw.action.length > LIMITS.action) at(`action is required, max ${LIMITS.action} chars`);
    if (raw.stat !== undefined) {
      if (!isRecord(raw.stat) || !nonEmpty(raw.stat.value) || !nonEmpty(raw.stat.label) || raw.stat.label.length > LIMITS.statLabel) {
        at('stat needs value and a short label');
      }
    }
    if (!oneOf(EVIDENCE_LEVELS, raw.evidence)) at('invalid evidence level');
    if (raw.caveat !== undefined && (!nonEmpty(raw.caveat) || raw.caveat.length > LIMITS.caveat)) at('caveat too long or empty');
    if (!Array.isArray(raw.triggers) || !raw.triggers.every((t) => oneOf(INSIGHT_TRIGGERS, t))) at('invalid triggers');
    if (!nonEmpty(raw.verifiedOn) || !DATE.test(raw.verifiedOn)) at('verifiedOn must be YYYY-MM-DD');

    const s = raw.source;
    if (!isRecord(s)) return at('source is required');
    if (!oneOf(SOURCE_TYPES, s.type)) at('invalid source.type');
    if (!nonEmpty(s.title) || !nonEmpty(s.authors)) at('source needs title and authors');
    if (typeof s.year !== 'number' || !Number.isInteger(s.year) || s.year < 1900 || s.year > currentYear) at('invalid source.year');
    if (!nonEmpty(s.url) || !s.url.startsWith('https://')) at('source.url must be https');
    if (s.doi !== undefined && (!nonEmpty(s.doi) || !s.doi.startsWith('10.'))) at('doi must start with "10."');
    // A popular book alone is not strong evidence.
    if (s.type === 'book' && raw.evidence !== 'emerging') at('book-only sources must be evidence "emerging" — cite the underlying study instead');
    if ((s.type === 'peer_reviewed' || s.type === 'meta_analysis') && !nonEmpty(s.doi)) at('journal sources need a DOI');
    if (raw.evidence !== 'strong' && !nonEmpty(raw.caveat)) at('non-strong evidence needs a caveat');
  });

  return errors;
}
