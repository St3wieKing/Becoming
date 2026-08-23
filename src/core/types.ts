export type Mode = 'serious' | 'game';

export type AIControlMode = 'manual' | 'assisted' | 'autopilot';

export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'someday';

export type Difficulty = 'easy' | 'moderate' | 'hard' | 'extreme';

export type GoalStatus =
  | 'healthy'
  | 'at_risk'
  | 'falling_behind'
  | 'critical'
  | 'paused'
  | 'abandoned'
  | 'completed';

export type Confidence = 'high' | 'moderate' | 'needs_attention';

export type SkipReason =
  | 'no_time'
  | 'too_hard'
  | 'unexpected'
  | 'lost_motivation'
  | 'bad_schedule'
  | 'less_important'
  | 'need_breakdown'
  | 'other';

export interface Vision {
  id: string;
  title: string;
  horizonYears: number;
  notes?: string;
}

export interface SmartDraft {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  deadline?: string;
}

export interface Goal {
  id: string;
  visionId?: string;
  title: string;
  smart?: SmartDraft;
  deadline?: string;
  difficulty: Difficulty;
  priority: Priority;
  status: GoalStatus;
  createdAt: string;
}

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  dueDate?: string;
  done: boolean;
}

export interface Task {
  id: string;
  goalId?: string;
  milestoneId?: string;
  goalTitle?: string;
  title: string;
  estimateMin: number;
  difficulty: Difficulty;
  priority: Priority;
  scheduledDate?: string;
  doneAt?: string;
  skipReason?: SkipReason;
  note?: string;
  isFrog: boolean;
  createdAt: string;
}

export interface CompletionRecord {
  id: string;
  taskId: string;
  date: string;
  done: boolean;
  reason?: SkipReason;
  note?: string;
  createdAt: string;
}

export interface CoinTransaction {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  startMin: number;
  endMin: number;
  source: 'internal' | 'external';
}
