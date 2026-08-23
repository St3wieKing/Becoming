import type { Difficulty } from '@/core/types';

const BASE_REWARD: Record<Difficulty, number> = {
  easy: 15,
  moderate: 30,
  hard: 60,
  extreme: 100,
};

export const EVIDENCE_BONUS = 10;
export const MAX_SINGLE_REWARD = 300;

export function rewardFor(input: {
  difficulty: Difficulty;
  isFrog: boolean;
  hasEvidence?: boolean;
}): number {
  let amount = BASE_REWARD[input.difficulty];
  if (input.isFrog) amount *= 2;
  if (input.hasEvidence) amount += EVIDENCE_BONUS;
  return Math.min(amount, MAX_SINGLE_REWARD);
}
