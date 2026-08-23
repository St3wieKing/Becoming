import type { SmartDraft } from '@/core/types';

export interface PlanDraftResult {
  smart: SmartDraft;
  source: 'heuristic' | 'remote';
}

export interface AIProvider {
  draftSmart(input: { title: string; deadline?: string }): Promise<PlanDraftResult>;
}

const DOMAIN_HINTS: { match: RegExp; relevance: string; measurable: string }[] = [
  {
    match: /run|marathon|5k|gym|fitness|workout|weight/i,
    relevance: 'physical health compounds into every other area of your life',
    measurable: 'a distance or session count per week',
  },
  {
    match: /study|exam|class|course|learn|degree|a in/i,
    relevance: 'learning builds the future options you described',
    measurable: 'a grade target or hours of deliberate practice per week',
  },
  {
    match: /money|save|invest|debt|income|budget|r?ich/i,
    relevance: 'financial stability buys freedom for everything else',
    measurable: 'an amount saved per month',
  },
  {
    match: /write|book|blog|art|music|channel|startup|business/i,
    relevance: 'creating things is how your vision becomes real',
    measurable: 'a finished artifact or weekly output target',
  },
];

const FALLBACK_HINT: { match: RegExp; relevance: string; measurable: string } = {
  match: /$^/,
  relevance: 'it moves you toward the person you want to become',
  measurable: 'a concrete number you can check weekly',
};

export function heuristicSmartDraft(input: { title: string; deadline?: string }): SmartDraft {
  const hint = DOMAIN_HINTS.find((h) => h.match.test(input.title)) ?? FALLBACK_HINT;
  return {
    specific: input.title.trim(),
    measurable: `Define ${hint.measurable} that proves this is done.`,
    achievable:
      input.deadline
        ? 'Check the deadline against your real available hours before committing.'
        : 'Pick a deadline far enough out to fit ~2 sessions per week.',
    relevant: `This matters because ${hint.relevance}.`,
    deadline: input.deadline,
  };
}
