import OpenAI from 'openai';
import { config } from './config';
import { ChatMessage } from './types';
import { webSearch } from './search';
import { generateImage } from './image';
import { generateDocxReport } from './report';
import { generateXlsx, SheetInput } from './spreadsheet';

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

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description: 'Tao mot hinh anh tu mo ta van ban khi nguoi dung yeu cau ve/tao/sinh anh.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Mo ta chi tiet hinh anh can tao, bang tieng Anh de ra ket qua tot nhat' },
        },
        required: ['prompt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_report',
      description:
        'Tao 1 file Word (.docx) bao cao/tai lieu de nguoi dung tai ve va chinh sua tiep, khi ' +
        'nguoi dung yeu cau xuat report/bao cao/tai lieu. Noi dung dung cu phap don gian: dong bat ' +
        'dau bang "# " la tieu de lon, "## " la tieu de nho, "- " la gach dau dong, con lai la ' +
        'doan van thuong. Moi dong cach nhau bang xuong dong.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Tieu de bao cao' },
          content: { type: 'string', description: 'Noi dung bao cao, moi dong cach nhau boi \\n' },
        },
        required: ['title', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_spreadsheet',
      description:
        'Tao 1 file Excel (.xlsx) de nguoi dung tai ve, khi nguoi dung yeu cau xuat Excel/bang tinh/' +
        'bang gia/bao gia/danh sach/bang so lieu, hoac du lieu dang bang (nhieu dong, nhieu cot). ' +
        'Moi sheet gom tieu de cot va cac dong du lieu. So luong, don gia, thanh tien dien dang so ' +
        '(khong kem don vi, khong dau cham phan cach hang nghin) de Excel tinh duoc. Co the dung ' +
        'cong thuc Excel bang chuoi bat dau bang "=", vi du "=C2*D2" hoac "=SUM(E2:E10)" (dong 1 la ' +
        'tieu de cot, du lieu bat dau tu dong 2). SDT, ma so co so 0 dau thi de dang chuoi.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Ten file Excel (khong can duoi .xlsx)' },
          sheets: {
            type: 'array',
            description: 'Danh sach sheet trong file',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Ten sheet, toi da 31 ky tu' },
                columns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tieu de cac cot',
                },
                rows: {
                  type: 'array',
                  description: 'Cac dong du lieu, moi dong la mang gia tri theo dung thu tu cot',
                  items: {
                    type: 'array',
                    items: {
                      anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'null' }],
                    },
                  },
                },
              },
              required: ['columns', 'rows'],
            },
          },
        },
        required: ['title', 'sheets'],
      },
    },
  },
  ...(config.searxngUrl
    ? [
        {
          type: 'function' as const,
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
    : []),
];

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

export interface GeneratedDocument {
  buffer: Buffer;
  filename: string;
}

async function runToolCall(
  toolCall: OpenAI.Chat.ChatCompletionMessageToolCall,
  images: Buffer[],
  documents: GeneratedDocument[]
): Promise<string> {
  if (toolCall.type !== 'function') {
    return 'Tool nay khong duoc ho tro.';
  }

  if (toolCall.function.name === 'generate_image') {
    try {
      const args = JSON.parse(toolCall.function.arguments) as { prompt: string };
      const image = await generateImage(args.prompt);
      images.push(image);
      return 'Da tao anh thanh cong va gui cho nguoi dung.';
    } catch (err) {
      return `Loi khi tao anh: ${(err as Error).message}`;
    }
  }

  if (toolCall.function.name === 'generate_report') {
    try {
      const args = JSON.parse(toolCall.function.arguments) as { title: string; content: string };
      const buffer = await generateDocxReport(args.title, args.content);
      const filename = `${args.title.trim().replace(/[\\/:*?"<>|]/g, '_') || 'bao-cao'}.docx`;
      documents.push({ buffer, filename });
      return 'Da tao file Word thanh cong va gui cho nguoi dung.';
    } catch (err) {
      return `Loi khi tao bao cao: ${(err as Error).message}`;
    }
  }

  if (toolCall.function.name === 'generate_spreadsheet') {
    try {
      const args = JSON.parse(toolCall.function.arguments) as { title: string; sheets: SheetInput[] };
      const buffer = await generateXlsx(args.title, args.sheets);
      const filename = `${(args.title ?? '').trim().replace(/[\\/:*?"<>|]/g, '_') || 'bang-tinh'}.xlsx`;
      documents.push({ buffer, filename });
      return 'Da tao file Excel thanh cong va gui cho nguoi dung.';
    } catch (err) {
      return `Loi khi tao file Excel: ${(err as Error).message}`;
    }
  }

  if (toolCall.function.name === 'web_search') {
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

  return `Khong ho tro tool "${toolCall.function.name}".`;
}

export interface ClaudeReply {
  text: string;
  images: Buffer[];
  documents: GeneratedDocument[];
}

export async function generateMorningGreeting(): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: config.systemPrompt },
    {
      role: 'user',
      content:
        'Bay gio la 9 gio sang. Hay chu dong gui mot loi chao buoi sang that ngot ngao, ngan gon, ' +
        'khac voi nhung lan truoc, de bat dau ngay moi that vui ve. Sau do, goi y ngan gon 1-2 viec ' +
        'ma Tro ly co the giup Co Chu trong ngay hom nay (vi du: tra cuu gia nguyen lieu/thi ' +
        'truong, tim thong tin nha cung cap hoac khach hang moi, soan tin nhan/bao gia, tao hinh ' +
        'anh minh hoa san pham...).',
    },
  ];

  const response = await createCompletion(messages);
  return response.choices[0]?.message?.content ?? 'Chao buoi sang! Chuc mot ngay tot lanh nhe.';
}

export async function askClaude(
  history: ChatMessage[],
  userMessage: string | OpenAI.Chat.ChatCompletionContentPart[],
  memories: ChatMessage[] = []
): Promise<ClaudeReply> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(memories) },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage },
  ];

  const images: Buffer[] = [];
  const documents: GeneratedDocument[] = [];

  for (let step = 0; step < 4; step += 1) {
    const response = await createCompletion(messages);
    const choice = response.choices[0]?.message;
    if (!choice) return { text: '(Khong co noi dung phan hoi)', images, documents };

    if (!choice.tool_calls || choice.tool_calls.length === 0) {
      return { text: choice.content ?? '(Khong co noi dung phan hoi)', images, documents };
    }

    messages.push(choice);
    for (const toolCall of choice.tool_calls) {
      const result = await runToolCall(toolCall, images, documents);
      messages.push({ role: 'tool', tool_call_id: toolCall.id, content: result });
    }
  }

  return {
    text: 'Xin loi, Co Chu thu hoi lai cau khac giup Mi nhe, thao tac hoi lau qua.',
    images,
    documents,
  };
}
