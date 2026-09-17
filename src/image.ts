import OpenAI from 'openai';
import { config } from './config';

const client = new OpenAI({ apiKey: config.aiApiKey, baseURL: config.imageBaseUrl });

export async function generateImage(prompt: string): Promise<Buffer> {
  const res = await client.images.generate({ model: config.imageModel, prompt });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('Khong nhan duoc du lieu anh tu API.');
  }
  return Buffer.from(b64, 'base64');
}
