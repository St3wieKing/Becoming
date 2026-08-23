import type { Confidence, GoalStatus } from '@/core/types';

export const STATUS_GLYPH: Record<GoalStatus, string> = {
  healthy: '🟢',
  at_risk: '🟡',
  falling_behind: '🟠',
  critical: '🔴',
  paused: '⏸',
  abandoned: '⛔',
  completed: '✅',
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: 'High',
  moderate: 'Moderate',
  needs_attention: 'Needs attention',
};

export const SPECIES = ['Dragon', 'Fox', 'Wolf', 'Owl', 'Cat', 'Bear', 'Stag', 'Robot', 'Frog'] as const;
export type Species = (typeof SPECIES)[number];

export const SPECIES_GLYPH: Record<Species, string> = {
  Dragon: '🐲',
  Fox: '🦊',
  Wolf: '🐺',
  Owl: '🦉',
  Cat: '🐱',
  Bear: '🐻',
  Stag: '🦌',
  Robot: '🤖',
  Frog: '🐸',
};
