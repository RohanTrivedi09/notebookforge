export type ParsedOutput =
  | { kind: 'stream'; text: string }
  | { kind: 'result'; text: string }
  | { kind: 'image'; data: string; mimeType: string }
  | { kind: 'error'; ename: string; evalue: string; traceback: string[] };

export type ParsedCell =
  | { type: 'markdown'; content: string }
  | { type: 'code'; cellNumber: number; source: string; outputs: ParsedOutput[] };

function joinText(data: string | string[] | undefined): string {
  if (!data) return '';
  if (Array.isArray(data)) return data.join('');
  return data;
}

export function parseNotebook(json: any): ParsedCell[] {
  if (!json || !Array.isArray(json.cells)) {
    throw new Error('Invalid notebook format: "cells" array not found.');
  }

  const parsedCells: ParsedCell[] = [];
  let codeCellCounter = 1;

  for (const cell of json.cells) {
    if (cell.cell_type === 'markdown') {
      parsedCells.push({
        type: 'markdown',
        content: joinText(cell.source),
      });
    } else if (cell.cell_type === 'code') {
      const outputs: ParsedOutput[] = [];
      if (Array.isArray(cell.outputs)) {
        for (const out of cell.outputs) {
          if (out.output_type === 'stream') {
            outputs.push({
              kind: 'stream',
              text: joinText(out.text),
            });
          } else if (
            out.output_type === 'execute_result' ||
            out.output_type === 'display_data'
          ) {
            const data = out.data || {};
            // Prefer image outputs over text
            if (data['image/png']) {
              outputs.push({
                kind: 'image',
                // strip newlines/whitespace that Jupyter sometimes inserts in base64
                data: joinText(data['image/png']).replace(/\s/g, ''),
                mimeType: 'image/png',
              });
            } else if (data['image/jpeg']) {
              outputs.push({
                kind: 'image',
                data: joinText(data['image/jpeg']).replace(/\s/g, ''),
                mimeType: 'image/jpeg',
              });
            } else if (data['image/gif']) {
              outputs.push({
                kind: 'image',
                data: joinText(data['image/gif']).replace(/\s/g, ''),
                mimeType: 'image/gif',
              });
            } else if (data['text/plain']) {
              outputs.push({
                kind: 'result',
                text: joinText(data['text/plain']),
              });
            }
          } else if (out.output_type === 'error') {
            outputs.push({
              kind: 'error',
              ename: out.ename || 'Error',
              evalue: out.evalue || '',
              traceback: Array.isArray(out.traceback) ? out.traceback : [],
            });
          }
        }
      }

      parsedCells.push({
        type: 'code',
        cellNumber:
          typeof cell.execution_count === 'number'
            ? cell.execution_count
            : codeCellCounter,
        source: joinText(cell.source),
        outputs,
      });
      codeCellCounter++;
    }
  }

  return parsedCells;
}
