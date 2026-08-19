import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  CloudUpload,
  ZoomIn,
  ZoomOut,
  Settings2,
  FileOutput,
  CheckCircle2,
  Clock,
  Sparkles,
  BookText,
  FileText,
  Files,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { parseNotebook, ParsedCell } from '@/lib/ipynb-parser';
import { generateDocx, generateDocxFromMarkdown, DocSettings, FontTheme } from '@/lib/docx-generator';
import { cellsToHtml } from '@/lib/markdown-to-html';
import PdfToMarkdown from '@/pages/PdfToMarkdown';
import { MarkdownToDocx } from '@/components/MarkdownToDocx';
import { BatchConverter } from '@/components/BatchConverter';
import { PlotsGalleryModal } from '@/components/PlotsGalleryModal';
import { addConversionHistory, getSnitchUser } from '@/lib/localStorage';

export default function Home() {
  const { toast } = useToast();
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

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
  const [rawMarkdown, setRawMarkdown] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<'ipynb' | 'markdown' | null>(null);
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

  const handleApplyPreset = (preset: 'academic' | 'modern' | 'classic') => {
    const user = getSnitchUser();
    const studentName = user?.name || 'Author Name';
    if (preset === 'academic') {
      setSettings((prev) => ({
        ...prev,
        fontTheme: 'academic',
        headerLeft: 'Course Code / Institution',
        headerCenter: '{date}',
        headerRight: 'Document Title',
        footerLeft: studentName,
        footerCenter: '',
        footerRight: 'Page {page}',
      }));
    } else if (preset === 'modern') {
      setSettings((prev) => ({
        ...prev,
        fontTheme: 'modern',
        headerLeft: prev.title ? '{title}' : '',
        headerCenter: '',
        headerRight: '{date}',
        footerLeft: 'Confidential',
        footerCenter: '',
        footerRight: 'Page {page} of {pages}',
      }));
    } else if (preset === 'classic') {
      setSettings((prev) => ({
        ...prev,
        fontTheme: 'classic',
        headerLeft: '',
        headerCenter: '',
        headerRight: '',
        footerLeft: '',
        footerCenter: 'Page {page}',
        footerRight: '',
      }));
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const lower = file.name.toLowerCase();
      setFileName(file.name);
      setIsProcessing(true);

      const reader = new FileReader();
      if (lower.endsWith('.ipynb')) {
        setFileType('ipynb');
        reader.onload = async (e) => {
          try {
            const text = e.target?.result as string;
            const json = JSON.parse(text);
            const cells = parseNotebook(json);
            setParsedCells(cells);
            setRawMarkdown('');
            toast({
              title: 'Notebook loaded',
              description: `Parsed ${cells.length} cells successfully.`,
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
        reader.readAsText(file);
      } else if (lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.txt')) {
        setFileType('markdown');
        reader.onload = (e) => {
          const text = (e.target?.result as string) || '';
          setRawMarkdown(text);
          setParsedCells([
            {
              type: 'markdown',
              content: text,
            },
          ]);
          setIsProcessing(false);
          toast({
            title: 'Markdown file loaded',
            description: `Loaded ${file.name}`,
          });
        };
        reader.readAsText(file);
      } else {
        toast({
          title: 'Unsupported format',
          description: 'Please upload a .ipynb, .md, or .txt file.',
          variant: 'destructive',
        });
        setIsProcessing(false);
      }
    },
    [toast],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/x-ipynb+json': ['.ipynb'],
      'text/markdown': ['.md', '.markdown', '.txt'],
    },
    maxFiles: 1,
  });

  const handleConvert = async () => {
    if (parsedCells.length === 0 && !rawMarkdown) {
      toast({
        title: 'No document loaded',
        description: 'Please upload a Jupyter Notebook or Markdown file first.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      if (fileType === 'markdown' && rawMarkdown) {
        await generateDocxFromMarkdown(rawMarkdown, settings, fileName);
      } else {
        await generateDocx(parsedCells, settings);
      }

      addConversionHistory({
        filename: fileName || 'notecraft_document',
        timestamp: Date.now(),
        headerConfig: settings.headerLeft || settings.headerCenter || settings.headerRight || '',
        footerConfig: settings.footerLeft || settings.footerCenter || settings.footerRight || '',
      });

      toast({
        title: 'Conversion complete!',
        description: 'Your Word document (.docx) has been downloaded.',
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
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Multi-tool Tabs Header */}
      <Tabs defaultValue="dashboard" className="w-full">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
          <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl h-11">
            <TabsTrigger
              value="dashboard"
              className="gap-2 font-medium text-xs sm:text-sm rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <BookText className="h-4 w-4" />
              Document Studio
            </TabsTrigger>
            <TabsTrigger
              value="pdf"
              className="gap-2 font-medium text-xs sm:text-sm rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <FileText className="h-4 w-4" />
              PDF → Markdown
            </TabsTrigger>
            <TabsTrigger
              value="markdown"
              className="gap-2 font-medium text-xs sm:text-sm rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <FileOutput className="h-4 w-4" />
              Markdown Editor
            </TabsTrigger>
            <TabsTrigger
              value="batch"
              className="gap-2 font-medium text-xs sm:text-sm rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <Files className="h-4 w-4" />
              Batch Convert
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Notecraft Main Dashboard */}
        <TabsContent value="dashboard" className="mt-0 focus-visible:outline-none">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left Column (5 Cols) - Upload & Presets */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-1">
                <h2 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  Document Conversion
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Upload your source files and apply formatting presets for instant Word documents.
                </p>
              </div>

              {/* Large Drag & Drop Box */}
              <div
                {...getRootProps()}
                className={`p-10 border border-dashed rounded-xl text-center cursor-pointer transition-all duration-200 bg-white dark:bg-slate-900/50 ${
                  isDragActive
                    ? 'border-[#001e40] bg-slate-50 dark:bg-slate-800/80 scale-[0.99]'
                    : 'border-slate-300 dark:border-slate-700 hover:border-[#001e40] hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                }`}
              >
                <input {...getInputProps()} />
                <div className="space-y-4">
                  <div className="mx-auto w-12 h-12 text-slate-400 dark:text-slate-500 flex items-center justify-center">
                    <CloudUpload className="w-10 h-10 stroke-[1.5]" />
                  </div>
                  {fileName ? (
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> File Loaded
                      </div>
                      <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate max-w-xs mx-auto">
                        {fileName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {parsedCells.length} cells parsed • Ready to convert
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        Drag and drop your Jupyter, PDF, or Markdown files here
                      </p>
                      <p className="text-xs text-slate-400">
                        or click to browse from your computer
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Formatting Presets */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Formatting Presets
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {(['academic', 'modern', 'classic'] as const).map((preset) => {
                    const isActive = settings.fontTheme === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className={`px-5 py-2 rounded-full text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-[#d5e3ff] text-[#001e40] dark:bg-slate-800 dark:text-slate-100 ring-1 ring-[#001e40] dark:ring-slate-500 font-semibold shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                        }`}
                      >
                        {preset.charAt(0).toUpperCase() + preset.slice(1)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons & Plot Gallery Trigger */}
              <div className="pt-2 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={handleConvert}
                    disabled={isProcessing}
                    size="lg"
                    className="bg-[#001e40] hover:bg-[#002d60] text-white dark:bg-white dark:text-[#001e40] dark:hover:bg-slate-100 font-medium px-8 py-6 rounded-lg text-sm transition-all shadow-sm flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileOutput className="w-4 h-4" />
                    )}
                    {isProcessing ? 'Converting...' : 'Convert to Word'}
                  </Button>

                  {plotCount > 0 && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setGalleryOpen(true)}
                      className="rounded-lg text-xs font-medium gap-1.5 h-12 border-slate-300 dark:border-slate-700"
                    >
                      <ImageIcon className="h-4 w-4 text-[#001e40] dark:text-slate-300" />
                      View Plots ({plotCount})
                    </Button>
                  )}
                </div>

                {/* Advanced Document Settings Accordion */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900/40">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    className="w-full px-4 py-3 flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-slate-400" />
                      Custom Headers, Footers & Filters
                    </span>
                    {showAdvancedSettings ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {showAdvancedSettings && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4 text-xs">
                      <div className="space-y-1.5">
                        <Label htmlFor="doc-title" className="text-xs">
                          Document Title Override
                        </Label>
                        <Input
                          id="doc-title"
                          value={settings.title}
                          onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                          placeholder="Leave empty to use main header"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Header (Left / Center / Right)
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            className="h-8 text-xs"
                            placeholder="Left"
                            value={settings.headerLeft}
                            onChange={(e) => setSettings({ ...settings, headerLeft: e.target.value })}
                          />
                          <Input
                            className="h-8 text-xs"
                            placeholder="Center"
                            value={settings.headerCenter}
                            onChange={(e) => setSettings({ ...settings, headerCenter: e.target.value })}
                          />
                          <Input
                            className="h-8 text-xs"
                            placeholder="Right"
                            value={settings.headerRight}
                            onChange={(e) => setSettings({ ...settings, headerRight: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Footer (Left / Center / Right)
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            className="h-8 text-xs"
                            placeholder="Left"
                            value={settings.footerLeft}
                            onChange={(e) => setSettings({ ...settings, footerLeft: e.target.value })}
                          />
                          <Input
                            className="h-8 text-xs"
                            placeholder="Center"
                            value={settings.footerCenter}
                            onChange={(e) => setSettings({ ...settings, footerCenter: e.target.value })}
                          />
                          <Input
                            className="h-8 text-xs"
                            placeholder="Right"
                            value={settings.footerRight}
                            onChange={(e) => setSettings({ ...settings, footerRight: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.includeOutputs ?? true}
                            onChange={(e) => setSettings({ ...settings, includeOutputs: e.target.checked })}
                            className="rounded border-slate-300 text-[#001e40]"
                          />
                          <span>Output streams</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.includeErrors ?? true}
                            onChange={(e) => setSettings({ ...settings, includeErrors: e.target.checked })}
                            className="rounded border-slate-300 text-[#001e40]"
                          />
                          <span>Error traces</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.includeImages ?? true}
                            onChange={(e) => setSettings({ ...settings, includeImages: e.target.checked })}
                            className="rounded border-slate-300 text-[#001e40]"
                          />
                          <span>Charts & Plots</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column (7 Cols) - Live Document Preview */}
            <div className="lg:col-span-7 sticky top-24">
              <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden bg-[#eef0f3] dark:bg-[#141822] flex flex-col h-[780px] shadow-sm">
                {/* Preview Toolbar */}
                <div className="px-5 py-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-serif text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Live Preview
                  </span>
                  <div className="flex items-center gap-2 text-slate-500">
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(z - 10, 60))}
                      className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-mono w-10 text-center">{zoomLevel}%</span>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(z + 10, 140))}
                      className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Document Canvas */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex justify-center">
                  <div
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: 'top center',
                      transition: 'transform 0.15s ease-out',
                    }}
                    className={`bg-white dark:bg-slate-950 w-full max-w-[620px] min-h-[850px] shadow-lg rounded-xs ring-1 ring-black/5 p-10 relative flex flex-col ${
                      settings.fontTheme === 'academic'
                        ? 'font-serif'
                        : settings.fontTheme === 'classic'
                        ? 'font-serif'
                        : 'font-sans'
                    }`}
                  >
                    {/* Header Mock */}
                    <div className="flex justify-between items-start text-[10px] text-slate-400 border-b border-slate-200/60 pb-3 mb-8">
                      <div className="w-1/3 text-left whitespace-pre-wrap">{processZoneText(settings.headerLeft)}</div>
                      <div className="w-1/3 text-center whitespace-pre-wrap">{processZoneText(settings.headerCenter)}</div>
                      <div className="w-1/3 text-right whitespace-pre-wrap">{processZoneText(settings.headerRight)}</div>
                    </div>

                    {/* Title */}
                    {settings.title ? (
                      <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50 mb-6">
                        {settings.title}
                      </h1>
                    ) : null}

                    {/* Document Content */}
                    <div className="flex-1 text-slate-800 dark:text-slate-200 text-xs leading-relaxed">
                      {parsedCells.length > 0 ? (
                        <div
                          className="prose prose-xs dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: previewHtml }}
                        />
                      ) : (
                        <div className="space-y-6 pt-4">
                          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            An Exploration of Advanced Methodologies
                          </h2>
                          <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                            Upload a Jupyter Notebook (.ipynb) or Markdown file to inspect the live formatted paper preview. Formatting presets will dynamically update typography, borders, and headers in real-time.
                          </p>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 pt-2">
                            2.1 Literature Review
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                            Code cells, formulas, tables, and charts are rendered with high-fidelity formatting, ready for instantaneous Microsoft Word export.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer Mock */}
                    <div className="flex justify-between items-end text-[10px] text-slate-400 border-t border-slate-200/60 pt-3 mt-10">
                      <div className="w-1/3 text-left whitespace-pre-wrap">{processZoneText(settings.footerLeft)}</div>
                      <div className="w-1/3 text-center whitespace-pre-wrap">{processZoneText(settings.footerCenter)}</div>
                      <div className="w-1/3 text-right whitespace-pre-wrap">{processZoneText(settings.footerRight)}</div>
                    </div>
                  </div>
                </div>
              </div>
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
        notebookName={fileName.replace(/\.ipynb$/i, '') || 'notecraft'}
      />
    </div>
  );
}
