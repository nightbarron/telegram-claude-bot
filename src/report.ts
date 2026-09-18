import { Document, Packer, Paragraph, HeadingLevel } from 'docx';

function lineToParagraph(line: string): Paragraph {
  const h2 = /^##\s+(.+)/.exec(line);
  if (h2) return new Paragraph({ text: h2[1], heading: HeadingLevel.HEADING_2 });

  const h1 = /^#\s+(.+)/.exec(line);
  if (h1) return new Paragraph({ text: h1[1], heading: HeadingLevel.HEADING_1 });

  const bullet = /^[-*]\s+(.+)/.exec(line);
  if (bullet) return new Paragraph({ text: bullet[1], bullet: { level: 0 } });

  return new Paragraph({ text: line });
}

export async function generateDocxReport(title: string, content: string): Promise<Buffer> {
  const paragraphs = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
    ...content.split('\n').map(lineToParagraph),
  ];

  const doc = new Document({ sections: [{ children: paragraphs }] });
  return Packer.toBuffer(doc);
}
