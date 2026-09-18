import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import PptxParser from 'node-pptx-parser';

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

async function extractXlsxText(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const parts: string[] = [];
  workbook.eachSheet((sheet) => {
    parts.push(`--- Sheet: ${sheet.name} ---`);
    sheet.eachRow((row) => {
      const cells = (row.values as unknown[]).slice(1).map((v) => (v == null ? '' : String(v)));
      parts.push(cells.join('\t'));
    });
  });
  return parts.join('\n');
}

async function extractPptxText(buffer: Buffer): Promise<string> {
  const tmpFile = path.join(os.tmpdir(), `pptx-${crypto.randomUUID()}.pptx`);
  fs.writeFileSync(tmpFile, buffer);
  try {
    const parser = new PptxParser(tmpFile);
    const slides = await parser.extractText();
    return slides.map((s) => `--- Slide ${s.id} ---\n${s.text.join('\n')}`).join('\n\n');
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

export async function extractTextFromDocument(
  buffer: Buffer,
  mimeType: string | undefined,
  filename: string
): Promise<string> {
  const lowerName = filename.toLowerCase();

  if (mimeType === 'application/pdf' || lowerName.endsWith('.pdf')) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return truncate(result.text);
    } finally {
      await parser.destroy();
    }
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return truncate(result.value);
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    lowerName.endsWith('.xlsx')
  ) {
    return truncate(await extractXlsxText(buffer));
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    lowerName.endsWith('.pptx')
  ) {
    return truncate(await extractPptxText(buffer));
  }

  if (isTextMime(mimeType) || /\.(txt|md|csv|log)$/i.test(filename)) {
    return truncate(buffer.toString('utf-8'));
  }

  throw new Error(
    'Dinh dang file nay chua doc duoc. Hien tai chi ho tro PDF, Word (.docx), Excel (.xlsx), ' +
      'PowerPoint (.pptx) va file van ban (.txt, .md, .csv, .json).'
  );
}
