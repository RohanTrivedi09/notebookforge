import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, FileText, Copy, Download, Trash2, Check, Code, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker using matching version CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;

export default function PdfToMarkdown() {
  const { toast } = useToast();
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [copied, setCopied] = useState(false);
  const [pageCount, setPageCount] = useState(0);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a valid PDF file.',
          variant: 'destructive',
        });
        return;
      }
      setFileName(file.name);
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const buf = e.target?.result as ArrayBuffer;
        try {
          const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(buf),
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/standard_fonts/`,
          });
          const pdf = await loadingTask.promise;
          setPageCount(pdf.numPages);
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            let pageText = '';
            let lastY: number | null = null;
            for (const item of textContent.items as any[]) {
              if ('str' in item) {
                if (lastY !== null && Math.abs(item.transform[5] - lastY) > 8) {
                  pageText += '\n';
                } else if (pageText && !pageText.endsWith(' ') && !pageText.endsWith('\n') && item.str) {
                  pageText += ' ';
                }
                pageText += item.str;
                lastY = item.transform[5];
              }
            }
            fullText += `## Page ${i}\n\n${pageText.trim()}\n\n`;
          }
          setMarkdown(fullText);
          toast({
            title: 'PDF extracted successfully',
            description: `Extracted text from ${pdf.numPages} page${pdf.numPages > 1 ? 's' : ''}.`,
          });
        } catch (err: any) {
          console.error('PDF parsing error:', err);
          toast({
            title: 'Error extracting PDF',
            description: err.message || 'Could not parse the PDF file.',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [toast],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const handleCopy = async () => {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    toast({
      title: 'Copied to clipboard',
      description: 'Markdown text copied to your clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace(/\.pdf$/i, '') || 'document'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: 'Downloaded Markdown',
      description: 'Markdown file saved successfully.',
    });
  };

  const handleClear = () => {
    setMarkdown('');
    setFileName('');
    setPageCount(0);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <Card className="border-primary/20 shadow-md">
        <CardHeader className="bg-muted/20 border-b">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            PDF to Markdown Converter
          </CardTitle>
          <CardDescription>
            Extract text and content from PDF documents directly in your browser without uploading to any server.
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
            <input {...getInputProps()} data-testid="pdf-dropzone" />
            <div className="space-y-3">
              <div className="mx-auto w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <Upload className="w-7 h-7" />
              </div>
              {fileName ? (
                <div>
                  <p className="font-semibold text-foreground">{fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {pageCount > 0 ? `${pageCount} pages parsed` : 'File ready'}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-foreground">
                    Drag & drop your PDF here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Accepts .pdf files (processed locally & securely)
                  </p>
                </div>
              )}
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="font-medium">Extracting PDF contents...</span>
            </div>
          )}

          {markdown && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Pages: <strong className="text-foreground">{pageCount}</strong></span>
                  <span>Characters: <strong className="text-foreground">{markdown.length}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-1.5 h-8 text-xs font-medium"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy MD'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="gap-1.5 h-8 text-xs font-medium"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download .md
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="gap-1.5 h-8 text-xs font-medium text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-48 grid-cols-2 mb-4">
                  <TabsTrigger value="preview" className="gap-1 text-xs">
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </TabsTrigger>
                  <TabsTrigger value="raw" className="gap-1 text-xs">
                    <Code className="h-3.5 w-3.5" /> Raw
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-0">
                  <div className="bg-card border rounded-lg p-6 max-h-[600px] overflow-y-auto prose dark:prose-invert max-w-none text-sm leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm as any, remarkMath as any]}
                      rehypePlugins={[rehypeKatex as any]}
                    >
                      {markdown}
                    </ReactMarkdown>
                  </div>
                </TabsContent>

                <TabsContent value="raw" className="mt-0">
                  <textarea
                    value={markdown}
                    onChange={(e) => setMarkdown(e.target.value)}
                    className="w-full h-[500px] font-mono text-xs p-4 rounded-lg border bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                    placeholder="Extracted Markdown content..."
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

