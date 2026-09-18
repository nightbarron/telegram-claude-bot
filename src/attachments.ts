import { PDFParse } from 'pdf-parse';

const MAX_TEXT_CHARS = 12000;

function truncate(text: string): string {
  return text.length > MAX_TEXT_CHARS
    ? `${text.slice(0, MAX_TEXT_CHARS)}\n...(noi dung da bi cat bot vi qua dai)...`
    : text;
}

const TEXT_MIME_PREFIXES = ['text/'];
const TEXT_MIME_EXACT = new Set(['application/json', 'application/xml']);

function isTextMime(mimeType: string | undefined): boolean {
  if (!mimeType) return false;
  return TEXT_MIME_PREFIXES.some((p) => mimeType.startsWith(p)) || TEXT_MIME_EXACT.has(mimeType);
}

export async function extractTextFromDocument(
  buffer: Buffer,
  mimeType: string | undefined,
  filename: string
): Promise<string> {
  if (mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return truncate(result.text);
    } finally {
      await parser.destroy();
    }
  }

  if (isTextMime(mimeType) || /\.(txt|md|csv|log)$/i.test(filename)) {
    return truncate(buffer.toString('utf-8'));
  }

  throw new Error(
    'Dinh dang file nay chua doc duoc. Hien tai chi ho tro file PDF va file van ban (.txt, .md, .csv, .json).'
  );
}
