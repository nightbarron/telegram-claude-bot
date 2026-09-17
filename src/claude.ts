import OpenAI from 'openai';
import { config } from './config';
import { ChatMessage } from './types';
import { webSearch } from './search';

const endpoints = Array.from(new Set([config.aiBaseUrl, config.aiBaseUrlBackup].filter(Boolean)));
const clients = endpoints.map((baseURL) => new OpenAI({ apiKey: config.aiApiKey, baseURL }));

const RETRIES_PER_ENDPOINT = 2;
const RETRY_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createCompletion(
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<OpenAI.Chat.ChatCompletion> {
  let lastError: unknown;

  for (let i = 0; i < clients.length; i += 1) {
    for (let attempt = 1; attempt <= RETRIES_PER_ENDPOINT; attempt += 1) {
      try {
        return await clients[i].chat.completions.create({
          model: config.claudeModel,
          max_tokens: config.maxTokens,
          messages,
          tools: tools.length > 0 ? tools : undefined,
        });
      } catch (err) {
        lastError = err;
        console.error(
          `Loi goi API (${endpoints[i]}, lan ${attempt}/${RETRIES_PER_ENDPOINT}):`,
          (err as Error).message
        );
        if (attempt < RETRIES_PER_ENDPOINT) {
          await sleep(RETRY_DELAY_MS * attempt);
        }
      }
    }
  }

  throw lastError;
}

const tools: OpenAI.Chat.ChatCompletionTool[] = config.searxngUrl
  ? [
      {
        type: 'function',
        function: {
          name: 'web_search',
          description:
            'Tim kiem thong tin thoi su/thuc te tren internet (gia ca, tin tuc, so lieu, thong tin ' +
            'cong ty...) khi cau hoi can du lieu moi ma ban khong chac chan.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Tu khoa tim kiem' },
            },
            required: ['query'],
          },
        },
      },
    ]
  : [];

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

async function runToolCall(toolCall: OpenAI.Chat.ChatCompletionMessageToolCall): Promise<string> {
  if (toolCall.type !== 'function' || toolCall.function.name !== 'web_search') {
    return 'Tool nay khong duoc ho tro.';
  }

  try {
    const args = JSON.parse(toolCall.function.arguments) as { query: string };
    const results = await webSearch(args.query);
    if (results.length === 0) return 'Khong tim thay ket qua nao.';
    return results
      .map((r, i) => `${i + 1}. ${r.title} (${r.url})\n${r.content}`)
      .join('\n\n');
  } catch (err) {
    return `Loi khi tim kiem: ${(err as Error).message}`;
  }
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

  for (let step = 0; step < 4; step += 1) {
    const response = await createCompletion(messages);
    const choice = response.choices[0]?.message;
    if (!choice) return '(Khong co noi dung phan hoi)';

    if (!choice.tool_calls || choice.tool_calls.length === 0) {
      return choice.content ?? '(Khong co noi dung phan hoi)';
    }

    messages.push(choice);
    for (const toolCall of choice.tool_calls) {
      const result = await runToolCall(toolCall);
      messages.push({ role: 'tool', tool_call_id: toolCall.id, content: result });
    }
  }

  return 'Xin loi, Co Chu thu hoi lai cau khac giup Tro ly nhe, tim kiem hoi lau qua.';
}
