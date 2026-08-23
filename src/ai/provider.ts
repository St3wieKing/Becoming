import type { PlanDraftResult } from '@/ai/heuristic';
import { heuristicSmartDraft } from '@/ai/heuristic';
import { remoteDraftSmart } from '@/ai/remote';

const REMOTE_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

export async function draftSmart(input: {
  title: string;
  deadline?: string;
}): Promise<PlanDraftResult> {
  if (REMOTE_KEY) {
    try {
      return await remoteDraftSmart(input);
    } catch {
      return { smart: heuristicSmartDraft(input), source: 'heuristic' };
    }
  }
  return { smart: heuristicSmartDraft(input), source: 'heuristic' };
}
