import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Settings, Eye, FileOutput, CheckCircle, Clock, ShieldCheck, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { parseNotebook, ParsedCell } from '@/lib/ipynb-parser';
import { generateDocx, DocSettings } from '@/lib/docx-generator';
import { cellsToHtml } from '@/lib/markdown-to-html';

export default function Home() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<DocSettings>({
    title: 'My Notebook',
    headerLeft: '',
    headerCenter: '',
    headerRight: '{date}',
    footerLeft: '',
    footerCenter: 'Page {page}',
    footerRight: ''
  });

  const [parsedCells, setParsedCells] = useState<ParsedCell[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApplyPreset = (preset: 'academic' | 'professional' | 'minimal') => {
    if (preset === 'academic') {
      setSettings({
        title: settings.title,
        headerLeft: 'Course Code',
        headerCenter: '{date}',
        headerRight: 'Course Name',
        footerLeft: 'Student Name',
        footerCenter: '',
        footerRight: 'Page {page}'
      });
    } else if (preset === 'professional') {
      setSettings({
        title: settings.title,
        headerLeft: '{title}',
        headerCenter: '',
        headerRight: '{date}',
        footerLeft: 'Confidential',
        footerCenter: '',
        footerRight: 'Page {page} of {pages}'
      });
    } else if (preset === 'minimal') {
      setSettings({
        title: settings.title,
        headerLeft: '',
        headerCenter: '',
        headerRight: '',
        footerLeft: '',
        footerCenter: 'Page {page}',
        footerRight: ''
      });
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.endsWith('.ipynb')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a valid Jupyter Notebook (.ipynb) file.",
        variant: "destructive"
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
          title: "File loaded successfully",
          description: `Parsed ${cells.length} cells. Ready to convert.`
        });
      } catch (err: any) {
        toast({
          title: "Error parsing notebook",
          description: err.message || "The file could not be parsed.",
          variant: "destructive"
        });
        setFileName('');
        setParsedCells([]);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      toast({
        title: "Error reading file",
        description: "An error occurred while reading the file.",
        variant: "destructive"
      });
      setIsProcessing(false);
    };
    reader.readAsText(file);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/x-ipynb+json': ['.ipynb']
    },
    maxFiles: 1
  });

  const handleConvert = async () => {
    if (parsedCells.length === 0) {
      toast({
        title: "No notebook loaded",
        description: "Please upload a .ipynb file first.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      await generateDocx(parsedCells, settings);
      toast({
        title: "Conversion complete!",
        description: "Your Word document has been downloaded."
      });
    } catch (err: any) {
      toast({
        title: "Conversion failed",
        description: err.message || "An error occurred during conversion.",
        variant: "destructive"
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
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-8 pb-4">
        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground">
          v1.0 is live — In-browser conversions
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-slate-50 max-w-4xl mx-auto">
          Free Jupyter Notebook to <br className="hidden md:block"/> Word Converter
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Convert .ipynb files to .docx documents instantly - No registration required!
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Clock className="h-4 w-4 text-primary" />
            Lightning Fast Conversion
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <ShieldCheck className="h-4 w-4 text-primary" />
            100% Secure & Private
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Award className="h-4 w-4 text-primary" />
            Professional Quality
          </div>
        </div>
        <p className="text-xs text-muted-foreground pt-2">Average conversion time: 3 seconds</p>
      </section>

      {/* SEO Paragraph Block */}
      <section className="max-w-3xl mx-auto bg-muted/30 p-6 rounded-lg border text-sm text-muted-foreground leading-relaxed">
        <p>
          NotebookForge is the ultimate tool for academics, data scientists, and engineers looking to transform Jupyter Notebooks (.ipynb) into Microsoft Word (.docx) documents. Whether you are submitting a university assignment, preparing a technical report, or sharing findings with non-technical stakeholders, our precise parser ensures your code, markdown, and error traces are beautifully formatted natively in Word. Because the conversion runs entirely in your browser, your code remains completely private.
        </p>
      </section>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Settings & Upload */}
        <div className="space-y-8">
          <Card className="border-primary/10 shadow-md">
            <CardHeader className="bg-muted/20 border-b">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Document Settings
              </CardTitle>
              <CardDescription>Configure the layout of your exported Word document.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              
              <div className="space-y-2">
                <Label htmlFor="title">Document Title</Label>
                <Input 
                  id="title" 
                  value={settings.title} 
                  onChange={(e) => setSettings({...settings, title: e.target.value})} 
                  placeholder="E.g. Final Project Report"
                />
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
                    <Input className="h-8 text-sm" value={settings.headerLeft} onChange={(e) => setSettings({...settings, headerLeft: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Center</Label>
                    <Input className="h-8 text-sm" value={settings.headerCenter} onChange={(e) => setSettings({...settings, headerCenter: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Right</Label>
                    <Input className="h-8 text-sm" value={settings.headerRight} onChange={(e) => setSettings({...settings, headerRight: e.target.value})} />
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
                    <Input className="h-8 text-sm" value={settings.footerLeft} onChange={(e) => setSettings({...settings, footerLeft: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Center</Label>
                    <Input className="h-8 text-sm" value={settings.footerCenter} onChange={(e) => setSettings({...settings, footerCenter: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Right</Label>
                    <Input className="h-8 text-sm" value={settings.footerRight} onChange={(e) => setSettings({...settings, footerRight: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Quick Presets</Label>
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
                <p className="text-xs text-muted-foreground">
                  Variables available: <code className="text-[10px] bg-muted px-1 py-0.5 rounded">{"{title}"}</code>, <code className="text-[10px] bg-muted px-1 py-0.5 rounded">{"{date}"}</code>, <code className="text-[10px] bg-muted px-1 py-0.5 rounded">{"{page}"}</code>, <code className="text-[10px] bg-muted px-1 py-0.5 rounded">{"{pages}"}</code>
                </p>
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
                      <p className="font-semibold text-lg text-slate-800 dark:text-slate-200">Drag & drop your notebook here</p>
                      <p className="text-sm text-muted-foreground mt-1">or click to browse files (accepts .ipynb only)</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            {fileName && (
              <CardFooter className="p-4 bg-muted/30 border-t flex justify-end">
                <Button 
                  onClick={(e) => { e.stopPropagation(); handleConvert(); }} 
                  disabled={isProcessing}
                  size="lg"
                  className="w-full sm:w-auto font-semibold gap-2 shadow-sm"
                  data-testid="button-convert"
                >
                  {isProcessing ? (
                    <Clock className="w-5 h-5 animate-spin" />
                  ) : (
                    <FileOutput className="w-5 h-5" />
                  )}
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
              {/* Paper mock */}
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
                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml }} />
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

    </div>
  );
}
