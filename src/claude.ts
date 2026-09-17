import OpenAI from 'openai';
import { config } from './config';
import { ChatMessage } from './types';

const client = new OpenAI({ apiKey: config.aiApiKey, baseURL: config.aiBaseUrl });

function buildSystemPrompt(memories: ChatMessage[]): string {
  if (memories.length === 0) return config.systemPrompt;

  const memoryText = memories
    .map((m) => {
      const date = new Date(m.timestamp).toLocaleDateString('vi-VN');
      const who = m.role === 'user' ? 'Nguoi dung' : 'Tro ly';
      return `[${date}] ${who}: ${m.content}`;
    })
    .join('\n');

  return (
    `${config.systemPrompt}\n\n` +
    'Duoi day la mot so doan hoi thoai cu co the lien quan den cau hoi hien tai ' +
    `(chi dung de tham khao neu phu hop):\n${memoryText}`
  );
}

export async function askClaude(
  history: ChatMessage[],
  userMessage: string,
  memories: ChatMessage[] = []
): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(memories) },
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
