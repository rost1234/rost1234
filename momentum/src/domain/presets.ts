import type { NewHabit } from './models';

export type GoalId = 'focus' | 'health' | 'mindset';

/** Presets are bilingual data so the domain stays free of UI/i18n dependencies. */
export type PresetLanguage = 'en' | 'he';
type Text = Readonly<Record<PresetLanguage, string>>;

export interface Goal {
  id: GoalId;
  title: string;
  subtitle: string;
  emoji: string;
}

export interface HabitPreset {
  key: string;
  habit: NewHabit;
  /** Short human summary, e.g. "4 times/day". */
  summary: string;
}

export interface TemplateGroup {
  id: string;
  title: string;
  emoji: string;
  presets: readonly HabitPreset[];
}

interface PresetDef {
  key: string;
  title: Text;
  step: Text;
  /** Absent = yes/no habit. */
  count?: { target: number; unit: Text };
}

interface GroupDef {
  id: string;
  title: Text;
  subtitle?: Text;
  emoji: string;
  presets: readonly PresetDef[];
}

const t = (en: string, he: string): Text => ({ en, he });
const yes = (key: string, title: Text, step: Text): PresetDef => ({ key, title, step });
const count = (key: string, title: Text, step: Text, target: number, unit: Text): PresetDef => ({ key, title, step, count: { target, unit } });

const GOAL_GROUPS: readonly (GroupDef & { id: GoalId; subtitle: Text })[] = [
  {
    id: 'focus',
    title: t('Focus & Deep Work', 'פוקוס ועבודה עמוקה'),
    subtitle: t('Protect your attention', 'להגן על הקשב שלך'),
    emoji: '🎯',
    presets: [
      count('deep-work', t('Deep Work Block', 'בלוק עבודה עמוקה'), t('Close all tabs, start a 25-min timer', 'לסגור את כל הלשוניות ולהפעיל טיימר של 25 דק׳'), 2, t('blocks', 'בלוקים')),
      count('read', t('Read', 'קריאה'), t('Open the book to the bookmark', 'לפתוח את הספר בסימנייה'), 10, t('pages', 'עמודים')),
      yes('plan', t('Plan Tomorrow', 'לתכנן את מחר'), t('Write the top 3 tasks for tomorrow', 'לכתוב את 3 המשימות החשובות למחר')),
    ],
  },
  {
    id: 'health',
    title: t('Health & Vitality', 'בריאות וחיוניות'),
    subtitle: t('Energy you can feel', 'אנרגיה שמרגישים'),
    emoji: '💪',
    presets: [
      count('water', t('Drink Water', 'לשתות מים'), t('Fill a glass and drink it', 'למלא כוס ולשתות'), 4, t('glasses', 'כוסות')),
      yes('walk', t('Move 20 Minutes', 'לזוז 20 דקות'), t('Put on your shoes', 'לנעול נעליים')),
      yes('sleep', t('Screens Off by 23:00', 'מסכים כבויים עד 23:00'), t('Plug the phone in outside the bedroom', 'להטעין את הטלפון מחוץ לחדר השינה')),
    ],
  },
  {
    id: 'mindset',
    title: t('Mindset & Peace', 'שקט ותודעה'),
    subtitle: t('A calmer, clearer mind', 'ראש רגוע וצלול יותר'),
    emoji: '🧘',
    presets: [
      yes('meditate', t('Meditate', 'מדיטציה'), t('Sit down and take 3 slow breaths', 'לשבת ולקחת 3 נשימות איטיות')),
      yes('journal', t('Journal', 'יומן'), t('Write one sentence', 'לכתוב משפט אחד')),
      count('gratitude', t('Gratitude Notes', 'רגעי הכרת תודה'), t('Name one good thing right now', 'לציין דבר טוב אחד עכשיו'), 3, t('notes', 'פעמים')),
    ],
  },
];

/** Extra starter sets beyond the onboarding goals (used by "Browse templates"). */
const EXTRA_GROUPS: readonly GroupDef[] = [
  {
    id: 'sleep',
    title: t('Better Sleep', 'שינה טובה יותר'),
    emoji: '🌙',
    presets: [
      yes('same-wake', t('Same Wake-up Time', 'להתעורר באותה שעה'), t('Put the alarm across the room', 'לשים את השעון המעורר בצד השני של החדר')),
      yes('morning-light', t('Morning Daylight', 'אור בוקר'), t('Step outside for 5 minutes', 'לצאת החוצה ל-5 דקות')),
      yes('no-late-coffee', t('No Caffeine After 14:00', 'בלי קפאין אחרי 14:00'), t('Swap the afternoon coffee for water', 'להחליף את הקפה של אחה״צ במים')),
    ],
  },
  {
    id: 'study',
    title: t('Study & Learning', 'לימודים ולמידה'),
    emoji: '📚',
    presets: [
      count('study-block', t('Study Block', 'בלוק לימוד'), t('Open the notes and set a 25-min timer', 'לפתוח את הסיכומים ולהפעיל טיימר של 25 דק׳'), 2, t('blocks', 'בלוקים')),
      yes('recall', t('Active Recall', 'שליפה פעילה'), t('Close the book and write what you remember', 'לסגור את הספר ולכתוב מה זוכרים')),
      count('flashcards', t('Flashcards', 'כרטיסיות'), t('Review the first card', 'לחזור על הכרטיסייה הראשונה'), 20, t('cards', 'כרטיסיות')),
    ],
  },
  {
    id: 'fitness',
    title: t('Fitness', 'כושר'),
    emoji: '🏃',
    presets: [
      count('steps', t('Walk', 'הליכה'), t('Walk to the end of the street', 'ללכת עד סוף הרחוב'), 30, t('min', 'דק׳')),
      count('pushups', t('Push-ups', 'שכיבות סמיכה'), t('Do one push-up', 'לעשות שכיבת סמיכה אחת'), 20, t('reps', 'חזרות')),
      yes('stretch', t('Stretch', 'מתיחות'), t('Touch your toes once', 'לגעת פעם אחת בבהונות')),
    ],
  },
  {
    id: 'adhd',
    title: t('ADHD-friendly', 'ידידותי ל-ADHD'),
    emoji: '⚡',
    presets: [
      yes('launchpad', t('Launch Pad Reset', 'עמדת יציאה מסודרת'), t('Put keys, wallet and phone in one spot', 'לשים מפתחות, ארנק וטלפון במקום אחד')),
      yes('one-thing', t('Pick One Thing', 'לבחור דבר אחד'), t('Write the single most important task', 'לכתוב את המשימה הכי חשובה')),
      count('body-double', t('Short Focus Sprint', 'ספרינט פוקוס קצר'), t('Start a 15-min timer, anything counts', 'להפעיל טיימר של 15 דק׳, כל התקדמות נחשבת'), 2, t('sprints', 'ספרינטים')),
    ],
  },
];

const ONCE_A_DAY: Text = t('Once a day', 'פעם ביום');

function toPreset(def: PresetDef, lang: PresetLanguage): HabitPreset {
  const base = { title: def.title[lang], microStep: def.step[lang], targetFrequency: 'daily' as const, targetDays: [] };
  if (!def.count) {
    return { key: def.key, habit: { ...base, isQuantitative: false, targetCount: 1, unit: '' }, summary: ONCE_A_DAY[lang] };
  }
  const unit = def.count.unit[lang];
  return {
    key: def.key,
    habit: { ...base, isQuantitative: true, targetCount: def.count.target, unit },
    summary: lang === 'he' ? `${def.count.target} ${unit} ביום` : `${def.count.target} ${unit}/day`,
  };
}

function toGroup(def: GroupDef, lang: PresetLanguage): TemplateGroup {
  return { id: def.id, title: def.title[lang], emoji: def.emoji, presets: def.presets.map((p) => toPreset(p, lang)) };
}

export function goals(lang: PresetLanguage): Goal[] {
  return GOAL_GROUPS.map((g) => ({ id: g.id, title: g.title[lang], subtitle: g.subtitle[lang], emoji: g.emoji }));
}

export function presetsForGoal(goal: GoalId, lang: PresetLanguage): HabitPreset[] {
  const group = GOAL_GROUPS.find((g) => g.id === goal);
  return group ? group.presets.map((p) => toPreset(p, lang)) : [];
}

export function templateGroups(lang: PresetLanguage): TemplateGroup[] {
  return [...GOAL_GROUPS, ...EXTRA_GROUPS].map((g) => toGroup(g, lang));
}

/** Three quick starters for an empty Today screen: one per onboarding goal. */
export function starterSuggestions(lang: PresetLanguage): HabitPreset[] {
  return GOAL_GROUPS.map((g) => g.presets[0])
    .filter((p): p is PresetDef => p !== undefined)
    .map((p) => toPreset(p, lang));
}
