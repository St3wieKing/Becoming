import type { Confidence, GoalStatus } from '@/core/types';
import { daysBetween } from '@/core/util';

export interface HealthInput {
  status: GoalStatus;
  deadline?: string;
  todayISO: string;
  completedCount: number;
  missedCount: number;
}

export interface HealthAssessment {
  status: GoalStatus;
  confidence: Confidence;
  reasons: string[];
}

export function assessHealth(input: HealthInput): HealthAssessment {
  if (input.status === 'paused' || input.status === 'completed') {
    return {
      status: input.status,
      confidence: input.status === 'completed' ? 'high' : 'moderate',
      reasons: [],
    };
  }
  const reasons: string[] = [];
  const daysLeft = input.deadline ? daysBetween(input.todayISO, input.deadline) : null;
  let status: GoalStatus = 'healthy';
  let confidence: Confidence = 'high';
  if (daysLeft !== null && daysLeft < 0) {
    status = 'critical';
    confidence = 'needs_attention';
    reasons.push(`deadline passed ${Math.abs(daysLeft)} day(s) ago`);
  } else if (input.missedCount >= 3) {
    status = 'falling_behind';
    confidence = 'needs_attention';
    reasons.push(`${input.missedCount} missed sessions`);
  } else if (input.missedCount > 0 || (daysLeft !== null && daysLeft <= 7)) {
    status = 'at_risk';
    confidence = 'moderate';
    if (input.missedCount > 0) reasons.push(`${input.missedCount} missed session(s)`);
    if (daysLeft !== null) reasons.push(`${daysLeft} day(s) left`);
  } else {
    reasons.push(`${input.completedCount} completed`);
    if (daysLeft !== null) reasons.push(`${daysLeft} day(s) of runway`);
  }
  return { status, confidence, reasons };
}
