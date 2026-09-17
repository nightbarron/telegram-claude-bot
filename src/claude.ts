import Anthropic from '@anthropic-ai/sdk';
import { config } from './config';
import { ChatMessage } from './types';

const client = new Anthropic({ apiKey: config.anthropicApiKey });

export async function askClaude(history: ChatMessage[], userMessage: string): Promise<string> {
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage },
  ];

  const response = await client.messages.create({
    model: config.claudeModel,
    max_tokens: config.maxTokens,
    system: config.systemPrompt,
    messages,
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text : '(Khong co noi dung phan hoi)';
}
