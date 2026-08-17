import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Files, Archive, CheckCircle2, AlertCircle, Loader2, Download, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { parseNotebook } from '@/lib/ipynb-parser';
import { generateDocxBlob, DocSettings } from '@/lib/docx-generator';
import { addConversionHistory, getSnitchUser } from '@/lib/localStorage';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;

interface BatchFileItem {
  id: string;
  file: File;
  name: string;
  type: 'ipynb' | 'pdf';
  status: 'idle' | 'processing' | 'done' | 'error';
  blob?: Blob;
  error?: string;
}

export function BatchConverter() {
  const { toast } = useToast();
  const [items, setItems] = useState<BatchFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [settings] = useState<DocSettings>(() => {
    const user = getSnitchUser();
    return {
      title: '',
      headerLeft: user?.defaultHeader ?? '',
      headerCenter: '',
      headerRight: '{date}',
      footerLeft: user?.name ? user.name : (user?.defaultFooter ?? ''),
      footerCenter: 'Page {page}',
      footerRight: '',
      fontTheme: 'academic',
    };
  });

  const onDrop = (acceptedFiles: File[]) => {
    const newItems: BatchFileItem[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      type: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'ipynb',
      status: 'idle',
    }));
    setItems((prev) => [...prev, ...newItems]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/x-ipynb+json': ['.ipynb'],
      'application/pdf': ['.pdf'],
    },
    multiple: true,
  });

  const handleConvertAll = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);
    setProgress(0);

    const updatedItems = [...items];
    const zip = new JSZip();
    let completedCount = 0;

    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      item.status = 'processing';
      setItems([...updatedItems]);

      try {
        if (item.type === 'ipynb') {
          const text = await item.file.text();
          const json = JSON.parse(text);
          const cells = parseNotebook(json);
          const blob = await generateDocxBlob(cells, settings);
          item.blob = blob;
          item.status = 'done';
          const outName = `${item.name.replace(/\.ipynb$/i, '')}.docx`;
          zip.file(outName, blob);
        } else if (item.type === 'pdf') {
          const buf = await item.file.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(buf),
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/cmaps/`,
            cMapPacked: true,
          });
          const pdf = await loadingTask.promise;
          let fullText = '';
          for (let p = 1; p <= pdf.numPages; p++) {
            const page = await pdf.getPage(p);
            const textContent = await page.getTextContent();
            const pageText = (textContent.items as any[])
              .map((it) => it.str ?? '')
              .join(' ');
            fullText += `## Page ${p}\n\n${pageText}\n\n`;
          }
          const blob = new Blob([fullText], { type: 'text/markdown;charset=utf-8' });
          item.blob = blob;
          item.status = 'done';
          const outName = `${item.name.replace(/\.pdf$/i, '')}.md`;
          zip.file(outName, blob);
        }

        addConversionHistory({
          filename: item.name,
          timestamp: Date.now(),
          headerConfig: 'Batch Conversion',
        });
      } catch (err: any) {
        item.status = 'error';
        item.error = err.message || 'Processing failed';
      }

      completedCount++;
      setProgress(Math.round((completedCount / updatedItems.length) * 100));
      setItems([...updatedItems]);
    }

    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, 'NotebookForge_Batch_Export.zip');
      toast({
        title: 'Batch conversion complete!',
        description: `Successfully converted files and downloaded zip archive.`,
      });
    } catch (e: any) {
      toast({
        title: 'Zip generation failed',
        description: e.message || 'Could not package the converted files.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSingle = (item: BatchFileItem) => {
    if (!item.blob) return;
    const ext = item.type === 'ipynb' ? 'docx' : 'md';
    const name = `${item.name.replace(/\.(ipynb|pdf)$/i, '')}.${ext}`;
    saveAs(item.blob, name);
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleClearAll = () => {
    setItems([]);
    setProgress(0);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <Card className="border-primary/20 shadow-md">
        <CardHeader className="bg-muted/20 border-b">
          <CardTitle className="flex items-center gap-2">
            <Files className="h-5 w-5 text-primary" />
            Batch Converter
          </CardTitle>
          <CardDescription>
            Convert multiple Jupyter Notebooks (.ipynb → .docx) and PDFs (.pdf → .md) simultaneously and download as a ZIP package.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div
            {...getRootProps()}
            className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all duration-200 ${
              isDragActive
                ? 'border-primary bg-primary/5 scale-[0.99]'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-3">
              <div className="mx-auto w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  Drag & drop multiple .ipynb or .pdf files here
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports batch processing of all course assignments and research documents.
                </p>
              </div>
            </div>
          </div>

          {items.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium text-foreground">
                  {items.length} file{items.length > 1 ? 's' : ''} queued
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={isProcessing}
                  className="h-8 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear list
                </Button>
              </div>

              {isProcessing && (
                <div className="space-y-2 py-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Converting batch...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card/60 hover:bg-muted/30 transition-colors text-sm"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-muted font-bold text-muted-foreground">
                        {item.type}
                      </span>
                      <span className="font-medium truncate max-w-xs sm:max-w-md">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === 'processing' && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                      {item.status === 'done' && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadSingle(item)}
                            className="h-7 text-xs px-2 gap-1"
                          >
                            <Download className="h-3 w-3" /> Get
                          </Button>
                        </div>
                      )}
                      {item.status === 'error' && (
                        <span className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3.5 w-3.5" /> Error
                        </span>
                      )}
                      {!isProcessing && (
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        {items.length > 0 && (
          <CardFooter className="p-4 bg-muted/20 border-t flex justify-end gap-3">
            <Button
              onClick={handleConvertAll}
              disabled={isProcessing}
              size="lg"
              className="gap-2 font-semibold shadow-sm"
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Archive className="h-5 w-5" />
              )}
              {isProcessing ? 'Processing Batch...' : 'Convert & Download ZIP'}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
