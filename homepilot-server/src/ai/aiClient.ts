import { env } from '../config/env';
import { AIError } from '../errors/specificErrors';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
// Verified against https://platform.claude.com/docs — override via env if
// Anthropic ships a newer default and this starts returning "model not found".
const MODEL = process.env.AI_MODEL ?? 'claude-sonnet-4-5';

export async function callAnthropic(systemPrompt: string, userMessage: string): Promise<string> {
  if (!env.ai.apiKey) {
    throw new AIError('AI assistant is not configured yet — set AI_API_KEY in the environment');
  }

  let response: Response;
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ai.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
  } catch {
    throw new AIError('Could not reach the AI service');
  }

  if (!response.ok) {
    let detail = '';
    try {
      const errorBody = (await response.json()) as { error?: { message?: string } };
      detail = errorBody.error?.message ?? '';
    } catch {
      // response body wasn't JSON — fall through with just the status code
    }
    throw new AIError(`AI service returned an error (${response.status})${detail ? `: ${detail}` : ''}`);
  }

  const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((block) => block.type === 'text')?.text;

  if (!text) {
    throw new AIError('AI service returned an empty response');
  }

  return text;
}
