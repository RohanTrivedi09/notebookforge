import { ParsedCell } from './ipynb-parser';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseInlineElements(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm font-mono">$1</code>',
  );
  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  return html;
}

function renderHtmlTable(lines: string[]): string {
  const rows = lines.map((line) =>
    line
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((cell) => cell.trim()),
  );

  if (rows.length === 0) return '';

  const separatorIdx = rows.findIndex((row) =>
    row.every((cell) => /^[-:| ]+$/.test(cell)),
  );

  let html =
    '<table class="border-collapse w-full mb-4 text-sm table-auto">';

  for (let i = 0; i < rows.length; i++) {
    if (i === separatorIdx) continue;
    const isHeader = separatorIdx > 0 && i < separatorIdx;
    const tag = isHeader ? 'th' : 'td';
    html += '<tr>';
    for (const cell of rows[i]) {
      const cls = isHeader
        ? 'border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-50 dark:bg-gray-800 font-semibold text-left'
        : 'border border-gray-300 dark:border-gray-600 px-3 py-2';
      html += `<${tag} class="${cls}">${parseInlineElements(cell)}</${tag}>`;
    }
    html += '</tr>';
  }

  html += '</table>';
  return html;
}

function parseMarkdownToHtml(content: string): string {
  const lines = content.split('\n');
  let html = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      html += '<br/>';
      i++;
      continue;
    }

    // Table: collect consecutive pipe-delimited rows
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      html += renderHtmlTable(tableLines);
      continue;
    }

    // Headings
    const hMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const text = parseInlineElements(hMatch[2]);
      const sizeClass =
        level === 1
          ? 'text-3xl'
          : level === 2
            ? 'text-2xl'
            : level === 3
              ? 'text-xl'
              : 'text-lg';
      html += `<h${level} class="font-bold my-2 text-foreground ${sizeClass}">${text}</h${level}>`;
      i++;
      continue;
    }

    // Normal paragraph
    html += `<p class="mb-2 leading-relaxed">${parseInlineElements(trimmed)}</p>`;
    i++;
  }

  return html;
}

export function cellsToHtml(cells: ParsedCell[]): string {
  let html = '';

  for (const cell of cells) {
    if (cell.type === 'markdown') {
      html += `<div class="mb-6">${parseMarkdownToHtml(cell.content)}</div>`;
    } else if (cell.type === 'code') {
      html += `<div class="mb-6">`;
      html += `<div class="text-gray-500 font-mono text-sm mb-1">In [${cell.cellNumber}]:</div>`;
      html += `<pre class="bg-slate-100 dark:bg-slate-900 p-3 rounded-md overflow-x-auto text-sm font-mono text-slate-800 dark:text-slate-200"><code>${escapeHtml(cell.source)}</code></pre>`;

      for (const out of cell.outputs) {
        if (out.kind === 'stream' || out.kind === 'result') {
          html += `<pre class="mt-2 text-sm font-mono whitespace-pre-wrap">${escapeHtml(out.text)}</pre>`;
        } else if (out.kind === 'image') {
          html += `<div class="mt-2"><img src="data:${out.mimeType};base64,${out.data}" alt="Cell output" class="max-w-full h-auto rounded border border-gray-200" style="max-height:400px;object-fit:contain;" /></div>`;
        } else if (out.kind === 'error') {
          html += `<pre class="mt-2 text-sm font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap">`;
          for (const traceLine of out.traceback) {
            const cleanLine = traceLine.replace(
              /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
              '',
            );
            html += escapeHtml(cleanLine) + '\n';
          }
          html += `</pre>`;
        }
      }
      html += `</div>`;
    }
  }

  return html;
}
