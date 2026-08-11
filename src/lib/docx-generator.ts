import {
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  PageNumber,
  Table,
  TableCell,
  TableRow,
  TextRun,
  AlignmentType,
  BorderStyle,
  ShadingType,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import { ParsedCell } from './ipynb-parser';

export interface DocSettings {
  title: string;
  headerLeft: string;
  headerCenter: string;
  headerRight: string;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const clean = base64.replace(/\s/g, '');
  const binary = atob(clean);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

/** Read PNG width/height from the IHDR chunk (bytes 16–23). */
function getPngDimensions(base64: string): { width: number; height: number } {
  try {
    // 33 bytes needed; 44 base64 chars covers that safely
    const binary = atob(base64.substring(0, 44));
    const w =
      (binary.charCodeAt(16) << 24) |
      (binary.charCodeAt(17) << 16) |
      (binary.charCodeAt(18) << 8) |
      binary.charCodeAt(19);
    const h =
      (binary.charCodeAt(20) << 24) |
      (binary.charCodeAt(21) << 16) |
      (binary.charCodeAt(22) << 8) |
      binary.charCodeAt(23);
    if (w > 0 && h > 0) return { width: w, height: h };
  } catch {
    /* fall through */
  }
  return { width: 600, height: 450 };
}

/** Scale image so width ≤ maxPx, preserving aspect ratio. */
function scaleDimensions(
  raw: { width: number; height: number },
  maxPx = 500,
): { width: number; height: number } {
  if (raw.width <= maxPx) return raw;
  const ratio = maxPx / raw.width;
  return { width: maxPx, height: Math.round(raw.height * ratio) };
}

// ── Inline markdown → docx runs ──────────────────────────────────────────────

type DocRun = TextRun | ExternalHyperlink;

/**
 * Parse a single markdown line into docx runs.
 * Handles **bold**, *italic*, and [text](url).
 */
const parseMarkdownLineToRuns = (line: string): DocRun[] => {
  const runs: DocRun[] = [];
  // Matches **bold**, *italic*, [link](url) in order
  const regex = /(\*\*.*?\*\*|\*.*?\*|__.*?__|_[^_]+_|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: line.substring(lastIndex, match.index) }));
    }

    const token = match[0];

    if (token.startsWith('[')) {
      // Hyperlink: [text](url)
      const linkText = match[2];
      const linkUrl = match[3];
      runs.push(
        new ExternalHyperlink({
          link: linkUrl,
          children: [
            new TextRun({
              text: linkText,
              style: 'Hyperlink',
            }),
          ],
        }),
      );
    } else if (token.startsWith('**') || token.startsWith('__')) {
      runs.push(
        new TextRun({ text: token.substring(2, token.length - 2), bold: true }),
      );
    } else {
      runs.push(
        new TextRun({
          text: token.substring(1, token.length - 1),
          italics: true,
        }),
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    runs.push(new TextRun({ text: line.substring(lastIndex) }));
  }

  return runs.length ? runs : [new TextRun({ text: line })];
};

// ── Markdown table → docx Table ──────────────────────────────────────────────

function buildDocxTable(lines: string[]): Table | null {
  const rows = lines
    .map((line) =>
      line
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => c.trim()),
    )
    .filter((row) => row.length > 0);

  if (rows.length === 0) return null;

  const separatorIdx = rows.findIndex((row) =>
    row.every((cell) => /^[-:| ]+$/.test(cell)),
  );

  const dataRows = rows.filter((_, i) => i !== separatorIdx);
  if (dataRows.length === 0) return null;

  const colCount = Math.max(...dataRows.map((r) => r.length));
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' };

  const tableRows = dataRows.map((row, rowIdx) => {
    const isHeader = separatorIdx > 0 && rowIdx < separatorIdx;
    const cells = Array.from({ length: colCount }, (_, ci) => {
      const cellText = row[ci] ?? '';
      const cellOptions: {
        children: Paragraph[];
        width: { size: number; type: (typeof WidthType)[keyof typeof WidthType] };
        shading?: { type: (typeof ShadingType)[keyof typeof ShadingType]; fill: string };
      } = {
        children: [
          new Paragraph({
            children: parseMarkdownLineToRuns(cellText),
            spacing: { after: 0, before: 0 },
          }),
        ],
        width: { size: Math.floor(9000 / colCount), type: WidthType.DXA },
      };
      if (isHeader) {
        cellOptions.shading = { type: ShadingType.CLEAR, fill: 'f1f5f9' };
      }
      return new TableCell(cellOptions);
    });

    return new TableRow({ children: cells });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: noBorder,
      bottom: noBorder,
      left: noBorder,
      right: noBorder,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'd1d5db' },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'd1d5db' },
    },
    rows: tableRows,
  });
}

// ── Python syntax highlighting ────────────────────────────────────────────────

const PYTHON_KEYWORDS = new Set([
  'if','else','elif','for','while','def','class','import','return',
  'True','False','None','and','or','not','in','is','from','as',
  'try','except','finally','with','pass','break','continue','yield',
  'lambda','global','nonlocal','del','raise','assert','async','await',
]);

const tokenizePythonLine = (line: string): TextRun[] => {
  const runs: TextRun[] = [];
  let currentStr = '';
  let inString = false;
  let stringChar = '';

  const flush = (color: string) => {
    if (!currentStr) return;
    runs.push(new TextRun({ text: currentStr, color, font: 'JetBrains Mono', size: 20 }));
    currentStr = '';
  };

  const flushWords = () => {
    if (!currentStr) return;
    const parts = currentStr.split(/(\b)/);
    for (const p of parts) {
      if (PYTHON_KEYWORDS.has(p)) {
        runs.push(new TextRun({ text: p, color: '2563eb', font: 'JetBrains Mono', size: 20 }));
      } else {
        runs.push(new TextRun({ text: p, color: '1e293b', font: 'JetBrains Mono', size: 20 }));
      }
    }
    currentStr = '';
  };

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inString) {
      currentStr += char;
      if (char === stringChar && line[i - 1] !== '\\') {
        inString = false;
        flush('16a34a');
      }
    } else if (char === '#') {
      flushWords();
      currentStr = line.substring(i);
      flush('6b7280');
      return runs;
    } else if (char === '"' || char === "'") {
      flushWords();
      inString = true;
      stringChar = char;
      currentStr += char;
    } else {
      currentStr += char;
    }
  }

  if (inString) flush('16a34a');
  else flushWords();

  return runs;
};

// ── Header / Footer helpers ───────────────────────────────────────────────────

type AlignmentTypeValue = (typeof AlignmentType)[keyof typeof AlignmentType];

const createZoneParagraph = (
  text: string,
  alignment: AlignmentTypeValue = AlignmentType.LEFT,
): Paragraph => {
  if (!text) return new Paragraph({ text: '', alignment });
  const runs: any[] = [];

  let remaining = text;
  while (remaining) {
    const m = remaining.match(/\{(page|pages|date|title)\}/);
    if (!m) {
      runs.push(new TextRun({ text: remaining }));
      break;
    }
    if (m.index! > 0) {
      runs.push(new TextRun({ text: remaining.substring(0, m.index) }));
    }
    if (m[1] === 'page') runs.push(PageNumber.CURRENT);
    else if (m[1] === 'pages') runs.push(PageNumber.TOTAL_PAGES);
    else if (m[1] === 'date')
      runs.push(new TextRun({ text: new Date().toLocaleDateString() }));
    // {title} is replaced before this function is called
    remaining = remaining.substring(m.index! + m[0].length);
  }

  return new Paragraph({ children: runs, alignment });
};

const noBorderCell = {
  top: { style: BorderStyle.NONE },
  bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE },
  right: { style: BorderStyle.NONE },
};

const createHeaderFooterTable = (
  left: string,
  center: string,
  right: string,
  title: string,
) => {
  const p = (s: string) => s.replace(/\{title\}/g, title);
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: noBorder,
      bottom: noBorder,
      left: noBorder,
      right: noBorder,
      insideHorizontal: noBorder,
      insideVertical: noBorder,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [createZoneParagraph(p(left), AlignmentType.LEFT)],
            width: { size: 33, type: WidthType.PERCENTAGE },
            borders: noBorderCell,
          }),
          new TableCell({
            children: [createZoneParagraph(p(center), AlignmentType.CENTER)],
            width: { size: 34, type: WidthType.PERCENTAGE },
            borders: noBorderCell,
          }),
          new TableCell({
            children: [createZoneParagraph(p(right), AlignmentType.RIGHT)],
            width: { size: 33, type: WidthType.PERCENTAGE },
            borders: noBorderCell,
          }),
        ],
      }),
    ],
  });
};

// ── Main export ───────────────────────────────────────────────────────────────

type HeadingLevelValue = (typeof HeadingLevel)[keyof typeof HeadingLevel];

export async function generateDocx(
  cells: ParsedCell[],
  settings: DocSettings,
): Promise<void> {
  const docChildren: any[] = [];

  // Title
  if (settings.title) {
    docChildren.push(
      new Paragraph({
        text: settings.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 },
      }),
    );
  }

  for (const cell of cells) {
    if (cell.type === 'markdown') {
      const lines = cell.content.split('\n');
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) {
          docChildren.push(new Paragraph({ text: '', spacing: { after: 200 } }));
          i++;
          continue;
        }

        // Table: collect consecutive pipe rows
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          const tableLines: string[] = [];
          while (i < lines.length && lines[i].trim().startsWith('|')) {
            tableLines.push(lines[i]);
            i++;
          }
          const tbl = buildDocxTable(tableLines);
          if (tbl) {
            docChildren.push(tbl);
            docChildren.push(new Paragraph({ text: '', spacing: { after: 160 } }));
          }
          continue;
        }

        // Heading
        const hMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (hMatch) {
          const lvl = hMatch[1].length;
          let level: HeadingLevelValue = HeadingLevel.HEADING_6;
          if (lvl === 1) level = HeadingLevel.HEADING_1;
          else if (lvl === 2) level = HeadingLevel.HEADING_2;
          else if (lvl === 3) level = HeadingLevel.HEADING_3;
          else if (lvl === 4) level = HeadingLevel.HEADING_4;
          else if (lvl === 5) level = HeadingLevel.HEADING_5;

          docChildren.push(
            new Paragraph({
              children: parseMarkdownLineToRuns(hMatch[2]),
              heading: level,
              spacing: { before: 240, after: 120 },
            }),
          );
        } else {
          docChildren.push(
            new Paragraph({
              children: parseMarkdownLineToRuns(trimmed),
              spacing: { after: 120 },
            }),
          );
        }
        i++;
      }
    } else if (cell.type === 'code') {
      // Label
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `In [${cell.cellNumber}]:`,
              color: '6b7280',
              font: 'JetBrains Mono',
              size: 20,
            }),
          ],
          spacing: { before: 240, after: 100 },
        }),
      );

      // Source
      const codeLines = cell.source.split('\n');
      for (const codeLine of codeLines) {
        docChildren.push(
          new Paragraph({
            children: tokenizePythonLine(codeLine),
            shading: { type: ShadingType.CLEAR, fill: 'f1f5f9' },
            spacing: { after: 0, before: 0 },
          }),
        );
      }
      docChildren.push(new Paragraph({ text: '', spacing: { after: 120 } }));

      // Outputs
      for (const out of cell.outputs) {
        if (out.kind === 'stream' || out.kind === 'result') {
          const outLines = out.text.split('\n');
          for (const outLine of outLines) {
            if (!outLine) continue;
            docChildren.push(
              new Paragraph({
                children: [
                  new TextRun({ text: outLine, font: 'JetBrains Mono', size: 20 }),
                ],
                spacing: { after: 0, before: 0 },
              }),
            );
          }
        } else if (out.kind === 'image') {
          try {
            const raw =
              out.mimeType === 'image/png'
                ? getPngDimensions(out.data)
                : { width: 600, height: 450 };
            const { width, height } = scaleDimensions(raw, 500);
            const imgType =
              out.mimeType === 'image/jpeg'
                ? 'jpg'
                : out.mimeType === 'image/gif'
                  ? 'gif'
                  : 'png';

            docChildren.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: base64ToArrayBuffer(out.data),
                    transformation: { width, height },
                    type: imgType,
                  }),
                ],
                spacing: { before: 120, after: 240 },
              }),
            );
          } catch {
            // if image embedding fails, just skip it silently
          }
        } else if (out.kind === 'error') {
          for (const traceLine of out.traceback) {
            const cleanLine = traceLine.replace(
              /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
              '',
            );
            docChildren.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: cleanLine,
                    color: 'dc2626',
                    font: 'JetBrains Mono',
                    size: 20,
                  }),
                ],
                spacing: { after: 0, before: 0 },
              }),
            );
          }
        }
      }
    }
  }

  const header = new Header({
    children: [
      createHeaderFooterTable(
        settings.headerLeft,
        settings.headerCenter,
        settings.headerRight,
        settings.title,
      ),
    ],
  });

  const footer = new Footer({
    children: [
      createHeaderFooterTable(
        settings.footerLeft,
        settings.footerCenter,
        settings.footerRight,
        settings.title,
      ),
    ],
  });

  const doc = new Document({
    sections: [
      {
        headers: { default: header },
        footers: { default: footer },
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeTitle =
    settings.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'notebook';
  saveAs(blob, `${safeTitle}.docx`);
}
