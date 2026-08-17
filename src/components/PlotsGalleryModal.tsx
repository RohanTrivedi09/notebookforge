import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Image as ImageIcon, Archive } from 'lucide-react';
import { ParsedCell } from '@/lib/ipynb-parser';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';

interface PlotsGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cells: ParsedCell[];
  notebookName?: string;
}

export function PlotsGalleryModal({ open, onOpenChange, cells, notebookName = 'notebook' }: PlotsGalleryModalProps) {
  const { toast } = useToast();

  const extractedImages = React.useMemo(() => {
    const images: { id: number; cellNumber: number; data: string; mimeType: string }[] = [];
    let count = 1;
    for (const cell of cells) {
      if (cell.type === 'code') {
        for (const out of cell.outputs) {
          if (out.kind === 'image') {
            images.push({
              id: count++,
              cellNumber: cell.cellNumber,
              data: out.data,
              mimeType: out.mimeType,
            });
          }
        }
      }
    }
    return images;
  }, [cells]);

  const handleDownloadImage = (img: typeof extractedImages[0]) => {
    const ext = img.mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const link = document.createElement('a');
    link.href = `data:${img.mimeType};base64,${img.data}`;
    link.download = `${notebookName}_plot_${img.id}.${ext}`;
    link.click();
  };

  const handleDownloadAllZip = async () => {
    if (extractedImages.length === 0) return;
    const zip = new JSZip();

    extractedImages.forEach((img) => {
      const ext = img.mimeType === 'image/jpeg' ? 'jpg' : 'png';
      zip.file(`plot_${img.id}_cell_${img.cellNumber}.${ext}`, img.data, { base64: true });
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${notebookName}_plots.zip`);
    toast({
      title: 'Plots downloaded',
      description: `Saved ${extractedImages.length} images as a zip package.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Extracted Notebook Plots & Figures ({extractedImages.length})
          </DialogTitle>
          <DialogDescription>
            High-resolution charts and figures detected in this notebook.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-2">
          {extractedImages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No plot or chart outputs found in this notebook.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {extractedImages.map((img) => (
                <div key={img.id} className="border rounded-lg p-3 bg-muted/10 flex flex-col justify-between space-y-3">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span className="font-semibold">Figure #{img.id}</span>
                    <span>Cell In [{img.cellNumber}]</span>
                  </div>
                  <div className="bg-background rounded border p-2 flex items-center justify-center min-h-[160px]">
                    <img
                      src={`data:${img.mimeType};base64,${img.data}`}
                      alt={`Plot ${img.id}`}
                      className="max-h-48 max-w-full object-contain rounded"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadImage(img)}
                    className="w-full gap-1.5 text-xs h-8"
                  >
                    <Download className="h-3.5 w-3.5" /> Download Figure
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {extractedImages.length > 0 && (
          <DialogFooter className="border-t pt-3 flex justify-between sm:justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {extractedImages.length} figures available
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handleDownloadAllZip} className="gap-1.5">
                <Archive className="h-4 w-4" /> Download All (.zip)
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
