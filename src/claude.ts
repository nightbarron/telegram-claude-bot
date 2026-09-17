import OpenAI from 'openai';
import { config } from './config';
import { ChatMessage } from './types';

const client = new OpenAI({ apiKey: config.aiApiKey, baseURL: config.aiBaseUrl });

export async function askClaude(history: ChatMessage[], userMessage: string): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: config.systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage },
  ];

  const response = await client.chat.completions.create({
    model: config.claudeModel,
    max_tokens: config.maxTokens,
    messages,
  });

  return response.choices[0]?.message?.content ?? '(Khong co noi dung phan hoi)';
}
