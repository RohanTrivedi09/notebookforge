import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  Settings,
  Eye,
  FileOutput,
  CheckCircle,
  Clock,
  ShieldCheck,
  Award,
  BookText,
  FileText,
  Files,
  Image as ImageIcon,
  SlidersHorizontal,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { parseNotebook, ParsedCell } from '@/lib/ipynb-parser';
import { generateDocx, DocSettings, FontTheme } from '@/lib/docx-generator';
import { cellsToHtml } from '@/lib/markdown-to-html';
import PdfToMarkdown from '@/pages/PdfToMarkdown';
import { MarkdownToDocx } from '@/components/MarkdownToDocx';
import { BatchConverter } from '@/components/BatchConverter';
import { PlotsGalleryModal } from '@/components/PlotsGalleryModal';
import { addConversionHistory, getSnitchUser } from '@/lib/localStorage';

export default function Home() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<DocSettings>(() => {
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
      includeOutputs: true,
      includeErrors: true,
      includeImages: true,
    };
  });

  const [parsedCells, setParsedCells] = useState<ParsedCell[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const plotCount = useMemo(() => {
    let count = 0;
    for (const cell of parsedCells) {
      if (cell.type === 'code') {
        for (const out of cell.outputs) {
          if (out.kind === 'image') count++;
        }
      }
    }
    return count;
  }, [parsedCells]);

  const handleApplyPreset = (preset: 'academic' | 'professional' | 'minimal') => {
    const user = getSnitchUser();
    const studentName = user?.name || 'Student Name';
    if (preset === 'academic') {
      setSettings({
        ...settings,
        fontTheme: 'academic',
        headerLeft: 'Course Code',
        headerCenter: '{date}',
        headerRight: 'Course Name',
        footerLeft: studentName,
        footerCenter: '',
        footerRight: 'Page {page}',
      });
    } else if (preset === 'professional') {
      setSettings({
        ...settings,
        fontTheme: 'modern',
        headerLeft: settings.title ? '{title}' : '',
        headerCenter: '',
        headerRight: '{date}',
        footerLeft: 'Confidential',
        footerCenter: '',
        footerRight: 'Page {page} of {pages}',
      });
    } else if (preset === 'minimal') {
      setSettings({
        ...settings,
        fontTheme: 'classic',
        headerLeft: '',
        headerCenter: '',
        headerRight: '',
        footerLeft: '',
        footerCenter: 'Page {page}',
        footerRight: '',
      });
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (!file.name.endsWith('.ipynb')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a valid Jupyter Notebook (.ipynb) file.',
          variant: 'destructive',
        });
        return;
      }

      setFileName(file.name);
      setIsProcessing(true);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const json = JSON.parse(text);
          const cells = parseNotebook(json);
          setParsedCells(cells);
          toast({
            title: 'File loaded successfully',
            description: `Parsed ${cells.length} cells. Ready to convert.`,
          });
        } catch (err: any) {
          toast({
            title: 'Error parsing notebook',
            description: err.message || 'The file could not be parsed.',
            variant: 'destructive',
          });
          setFileName('');
          setParsedCells([]);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        toast({
          title: 'Error reading file',
          description: 'An error occurred while reading the file.',
          variant: 'destructive',
        });
        setIsProcessing(false);
      };
      reader.readAsText(file);
    },
    [toast],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/x-ipynb+json': ['.ipynb'],
    },
    maxFiles: 1,
  });

  const handleConvert = async () => {
    if (parsedCells.length === 0) {
      toast({
        title: 'No notebook loaded',
        description: 'Please upload a .ipynb file first.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      await generateDocx(parsedCells, settings);
      addConversionHistory({
        filename: fileName || 'notebook.ipynb',
        timestamp: Date.now(),
        headerConfig: settings.headerLeft || settings.headerCenter || settings.headerRight || '',
        footerConfig: settings.footerLeft || settings.footerCenter || settings.footerRight || '',
      });
      toast({
        title: 'Conversion complete!',
        description: 'Your Word document has been downloaded.',
      });
    } catch (err: any) {
      toast({
        title: 'Conversion failed',
        description: err.message || 'An error occurred during conversion.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processZoneText = (text: string) => {
    let out = text;
    out = out.replace(/\{title\}/g, settings.title || '');
    out = out.replace(/\{date\}/g, new Date().toLocaleDateString());
    out = out.replace(/\{page\}/g, '1');
    out = out.replace(/\{pages\}/g, '1');
    return out;
  };

  const previewHtml = useMemo(() => {
    if (parsedCells.length === 0) return '';
    return cellsToHtml(parsedCells);
  }, [parsedCells]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      {/* Hero Section */}
      <section className="text-center space-y-4 pt-6 pb-2">
        <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold border-transparent bg-secondary text-secondary-foreground">
          v2.0 is live — In-browser Jupyter, PDF & Markdown Studio
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-slate-50 max-w-4xl mx-auto">
          Convert Jupyter, PDF & Markdown <br className="hidden md:block" /> to Beautiful Word Documents
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Convert .ipynb and .md files to formatted .docx documents natively in your browser. 100% private.
        </p>

        <div className="flex flex-wrap justify-center gap-6 pt-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Clock className="h-4 w-4 text-primary" />
            Lightning Fast
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <ShieldCheck className="h-4 w-4 text-primary" />
            100% Local & Private
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Award className="h-4 w-4 text-primary" />
            Academic & Pro Formats
          </div>
        </div>
      </section>

      {/* Main Multi-tool Tab Navigation */}
      <Tabs defaultValue="notebook" className="w-full">
        <div className="flex justify-center mb-8">
          <TabsList className="grid w-full max-w-2xl grid-cols-2 sm:grid-cols-4 h-12 p-1.5 bg-muted/80 rounded-xl shadow-sm border">
            <TabsTrigger
              value="notebook"
              className="gap-1.5 font-semibold text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <BookText className="h-4 w-4 text-primary" />
              Jupyter → Word
            </TabsTrigger>
            <TabsTrigger
              value="pdf"
              className="gap-1.5 font-semibold text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <FileText className="h-4 w-4 text-primary" />
              PDF → Markdown
            </TabsTrigger>
            <TabsTrigger
              value="markdown"
              className="gap-1.5 font-semibold text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <FileOutput className="h-4 w-4 text-primary" />
              Markdown → Word
            </TabsTrigger>
            <TabsTrigger
              value="batch"
              className="gap-1.5 font-semibold text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <Files className="h-4 w-4 text-primary" />
              Batch Convert
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Jupyter -> Word */}
        <TabsContent value="notebook" className="mt-0 focus-visible:outline-none space-y-8">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Left Column: Settings & Upload */}
            <div className="space-y-6">
              <Card className="border-primary/10 shadow-md">
                <CardHeader className="bg-muted/20 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Document Settings
                  </CardTitle>
                  <CardDescription>Configure layout, presets, and font theme for Word export.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Document Title</Label>
                    <Input
                      id="title"
                      value={settings.title}
                      onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                      placeholder="Leave empty to use notebook heading"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Font & Typography Theme</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['academic', 'modern', 'classic'] as FontTheme[]).map((theme) => (
                        <Button
                          key={theme}
                          type="button"
                          variant={settings.fontTheme === theme ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSettings({ ...settings, fontTheme: theme })}
                          className="capitalize text-xs font-medium"
                        >
                          {theme}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <div className="w-full h-px bg-border flex-1" />
                      Header Configuration
                      <div className="w-full h-px bg-border flex-1" />
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Left</Label>
                        <Input
                          className="h-8 text-sm"
                          value={settings.headerLeft}
                          onChange={(e) => setSettings({ ...settings, headerLeft: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Center</Label>
                        <Input
                          className="h-8 text-sm"
                          value={settings.headerCenter}
                          onChange={(e) => setSettings({ ...settings, headerCenter: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Right</Label>
                        <Input
                          className="h-8 text-sm"
                          value={settings.headerRight}
                          onChange={(e) => setSettings({ ...settings, headerRight: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <div className="w-full h-px bg-border flex-1" />
                      Footer Configuration
                      <div className="w-full h-px bg-border flex-1" />
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Left</Label>
                        <Input
                          className="h-8 text-sm"
                          value={settings.footerLeft}
                          onChange={(e) => setSettings({ ...settings, footerLeft: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Center</Label>
                        <Input
                          className="h-8 text-sm"
                          value={settings.footerCenter}
                          onChange={(e) => setSettings({ ...settings, footerCenter: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Right</Label>
                        <Input
                          className="h-8 text-sm"
                          value={settings.footerRight}
                          onChange={(e) => setSettings({ ...settings, footerRight: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Selective Content Filters
                    </Label>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.includeOutputs ?? true}
                          onChange={(e) => setSettings({ ...settings, includeOutputs: e.target.checked })}
                          className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span>Include Output Streams</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.includeErrors ?? true}
                          onChange={(e) => setSettings({ ...settings, includeErrors: e.target.checked })}
                          className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span>Include Errors</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.includeImages ?? true}
                          onChange={(e) => setSettings({ ...settings, includeImages: e.target.checked })}
                          className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span>Include Charts & Plots</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Quick Presets
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleApplyPreset('academic')} className="text-xs h-8">
                        Academic Format
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleApplyPreset('professional')} className="text-xs h-8">
                        Professional Format
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleApplyPreset('minimal')} className="text-xs h-8">
                        Minimal Format
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 shadow-lg border-2">
                <CardContent className="p-0">
                  <div
                    {...getRootProps()}
                    className={`p-8 md:p-12 text-center cursor-pointer transition-all duration-200 
                      ${isDragActive ? 'bg-primary/5' : 'hover:bg-muted/50'}
                      ${fileName ? 'bg-green-50/50 dark:bg-green-950/20' : ''}
                    `}
                  >
                    <input {...getInputProps()} data-testid="input-file-upload" />

                    {fileName ? (
                      <div className="space-y-4 animate-in zoom-in duration-300">
                        <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center dark:bg-green-900 dark:text-green-300">
                          <CheckCircle className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg text-slate-800 dark:text-slate-200">{fileName}</p>
                          <p className="text-sm text-muted-foreground">{parsedCells.length} cells parsed successfully</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Upload className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg text-slate-800 dark:text-slate-200">
                            Drag & drop your notebook here
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            or click to browse files (accepts .ipynb only)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
                {fileName && (
                  <CardFooter className="p-4 bg-muted/30 border-t flex flex-wrap justify-between gap-3">
                    {plotCount > 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setGalleryOpen(true)}
                        className="gap-1.5 text-xs font-medium"
                      >
                        <ImageIcon className="h-4 w-4 text-primary" /> View Plots ({plotCount})
                      </Button>
                    ) : (
                      <div />
                    )}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConvert();
                      }}
                      disabled={isProcessing}
                      size="lg"
                      className="font-semibold gap-2 shadow-sm"
                      data-testid="button-convert"
                    >
                      {isProcessing ? <Clock className="w-5 h-5 animate-spin" /> : <FileOutput className="w-5 h-5" />}
                      {isProcessing ? 'Converting...' : 'Convert to Word (.docx)'}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </div>

            {/* Right Column: Live Preview */}
            <div className="sticky top-24">
              <Card className="border-border shadow-sm overflow-hidden h-[800px] flex flex-col bg-[#f8fafc] dark:bg-[#0f172a]">
                <CardHeader className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b py-3 px-4 flex-none">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Eye className="h-4 w-4" />
                    Live Document Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex-1 overflow-y-auto">
                  <div className="bg-white dark:bg-slate-950 w-full min-h-[1056px] shadow-sm ring-1 ring-black/5 mx-auto p-8 sm:p-12 relative flex flex-col">
                    {/* Header Mock */}
                    <div className="flex justify-between items-start text-[11px] text-slate-400 font-serif border-b pb-4 mb-8">
                      <div className="w-1/3 text-left whitespace-pre-wrap">{processZoneText(settings.headerLeft)}</div>
                      <div className="w-1/3 text-center whitespace-pre-wrap">{processZoneText(settings.headerCenter)}</div>
                      <div className="w-1/3 text-right whitespace-pre-wrap">{processZoneText(settings.headerRight)}</div>
                    </div>

                    {/* Title */}
                    {settings.title && (
                      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-8 font-sans">
                        {settings.title}
                      </h1>
                    )}

                    {/* Content */}
                    <div className="flex-1 text-slate-800 dark:text-slate-200">
                      {parsedCells.length > 0 ? (
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: previewHtml }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-4">
                          <Eye className="w-12 h-12 opacity-20" />
                          <p className="text-sm italic">Document content will appear here once a file is uploaded...</p>
                        </div>
                      )}
                    </div>

                    {/* Footer Mock */}
                    <div className="flex justify-between items-end text-[11px] text-slate-400 font-serif border-t pt-4 mt-12">
                      <div className="w-1/3 text-left whitespace-pre-wrap">{processZoneText(settings.footerLeft)}</div>
                      <div className="w-1/3 text-center whitespace-pre-wrap">{processZoneText(settings.footerCenter)}</div>
                      <div className="w-1/3 text-right whitespace-pre-wrap">{processZoneText(settings.footerRight)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: PDF -> Markdown */}
        <TabsContent value="pdf" className="mt-0 focus-visible:outline-none">
          <PdfToMarkdown />
        </TabsContent>

        {/* Tab 3: Markdown -> Word */}
        <TabsContent value="markdown" className="mt-0 focus-visible:outline-none">
          <MarkdownToDocx />
        </TabsContent>

        {/* Tab 4: Batch Converter */}
        <TabsContent value="batch" className="mt-0 focus-visible:outline-none">
          <BatchConverter />
        </TabsContent>
      </Tabs>

      {/* Plot Gallery Modal */}
      <PlotsGalleryModal
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        cells={parsedCells}
        notebookName={fileName.replace(/\.ipynb$/i, '') || 'notebook'}
      />
    </div>
  );
}
