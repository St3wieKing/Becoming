import type { SmartDraft } from '@/core/types';
import type { PlanDraftResult } from '@/ai/heuristic';

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
}

export async function remoteDraftSmart(input: {
  title: string;
  deadline?: string;
}): Promise<PlanDraftResult> {
  const key = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
  const model = process.env.EXPO_PUBLIC_AI_MODEL ?? 'claude-sonnet-4-5';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `Turn this goal into a SMART plan draft. Reply ONLY with minified JSON with keys specific, measurable, achievable, relevant (all strings). Goal: "${input.title}"${
            input.deadline ? ` Deadline: ${input.deadline}` : ''
          }`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
  const data = (await res.json()) as AnthropicResponse;
  const text = data.content?.map((c) => c.text ?? '').join('') ?? '';
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI returned no JSON');
  const parsed = JSON.parse(text.slice(start, end + 1)) as Partial<SmartDraft>;
  if (!parsed.specific || !parsed.measurable || !parsed.achievable || !parsed.relevant) {
    throw new Error('AI JSON incomplete');
  }
  return {
    smart: {
      specific: parsed.specific,
      measurable: parsed.measurable,
      achievable: parsed.achievable,
      relevant: parsed.relevant,
      deadline: input.deadline,
    },
    source: 'remote',
  };
}
