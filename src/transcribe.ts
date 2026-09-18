import OpenAI, { toFile } from 'openai';
import { config } from './config';

const client = new OpenAI({ apiKey: config.aiApiKey, baseURL: config.aiBaseUrl });

export async function transcribeAudio(buffer: Buffer, filename: string): Promise<string> {
  const file = await toFile(buffer, filename);
  const res = await client.audio.transcriptions.create({ model: config.whisperModel, file });
  return res.text;
}
