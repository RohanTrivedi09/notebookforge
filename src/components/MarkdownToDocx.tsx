import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, FileOutput, Settings, Sparkles, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateDocxFromMarkdown, DocSettings, FontTheme } from '@/lib/docx-generator';
import { addConversionHistory, getSnitchUser } from '@/lib/localStorage';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export function MarkdownToDocx() {
  const { toast } = useToast();
  const [markdown, setMarkdown] = useState<string>(`# Lab Report: Deep Learning & Computer Vision

## 1. Introduction
This document details the experimental findings and model architecture evaluation.

### Key Objectives:
- Implement convolutional filters and feature extraction.
- Compare baseline accuracy against augmented dataset.

| Model Variant | Epochs | Accuracy | Loss |
|:--------------|:-------|:---------|:-----|
| Baseline CNN  | 20     | 87.4%    | 0.32 |
| ResNet-18     | 20     | 94.8%    | 0.18 |
| EfficientNet  | 20     | **96.2%**| **0.12** |

## 2. Methodology
The dataset was preprocessed using standard normalization and random horizontal flips.
\`\`\`python
# Inline snippet example
model.compile(optimizer='adam', loss='cross_entropy')
\`\`\`
`);

  const [fileName, setFileName] = useState<string>('report.md');
  const [isProcessing, setIsProcessing] = useState(false);

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
    };
  });

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setMarkdown((e.target?.result as string) || '');
      toast({
        title: 'Markdown file loaded',
        description: `Loaded ${file.name} (${((file.size) / 1024).toFixed(1)} KB)`,
      });
    };
    reader.readAsText(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/markdown': ['.md', '.markdown', '.txt'] },
    multiple: false,
  });

  const handleConvert = async () => {
    if (!markdown.trim()) {
      toast({
        title: 'Empty Markdown',
        description: 'Please write or upload some markdown content.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      await generateDocxFromMarkdown(markdown, settings, fileName);
      addConversionHistory({
        filename: fileName,
        timestamp: Date.now(),
        headerConfig: settings.headerLeft || settings.headerCenter || '',
        footerConfig: settings.footerLeft || settings.footerCenter || '',
      });
      toast({
        title: 'Document created!',
        description: 'Your Word document (.docx) has been downloaded.',
      });
    } catch (err: any) {
      toast({
        title: 'Export failed',
        description: err.message || 'An error occurred during Word export.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

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

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Markdown Editor & Settings */}
        <div className="space-y-6">
          <Card className="border-primary/10 shadow-md">
            <CardHeader className="bg-muted/20 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Markdown Input
              </CardTitle>
              <CardDescription>
                Upload a .md file or write Markdown with tables, math, and bold text.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div
                {...getRootProps()}
                className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all duration-200 ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex items-center justify-center gap-3">
                  <Upload className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">
                    {fileName ? `File: ${fileName}` : 'Drop .md file here or click to browse'}
                  </span>
                </div>
              </div>

              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                className="w-full h-80 font-mono text-xs p-4 rounded-lg border bg-muted/10 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y leading-relaxed"
                placeholder="Type your markdown here..."
              />
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-md">
            <CardHeader className="bg-muted/20 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5 text-primary" />
                Document Layout & Styling
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="md-title">Optional Document Title</Label>
                <Input
                  id="md-title"
                  value={settings.title}
                  onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                  placeholder="Leave empty to use top heading"
                />
              </div>

              <div className="space-y-2">
                <Label>Typography & Font Theme</Label>
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

              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Header & Footer Presets
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleApplyPreset('academic')} className="text-xs h-8">
                    Academic
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleApplyPreset('professional')} className="text-xs h-8">
                    Professional
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleApplyPreset('minimal')} className="text-xs h-8">
                    Minimal
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-4 bg-muted/20 border-t flex justify-end">
              <Button
                onClick={handleConvert}
                disabled={isProcessing}
                size="lg"
                className="font-semibold gap-2 shadow-sm"
              >
                <FileOutput className="h-5 w-5" />
                {isProcessing ? 'Generating...' : 'Convert to Word (.docx)'}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Live Document Preview */}
        <div className="sticky top-24">
          <Card className="border-border shadow-sm overflow-hidden h-[740px] flex flex-col bg-[#f8fafc] dark:bg-[#0f172a]">
            <CardHeader className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b py-3 px-4 flex-none">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Sparkles className="h-4 w-4 text-primary" />
                Live Markdown Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 overflow-y-auto">
              <div className="bg-white dark:bg-slate-950 w-full min-h-[900px] shadow-sm ring-1 ring-black/5 mx-auto p-8 sm:p-12 relative flex flex-col">
                {/* Header Mock */}
                <div className="flex justify-between items-start text-[11px] text-slate-400 font-serif border-b pb-4 mb-6">
                  <div className="w-1/3 text-left">{settings.headerLeft}</div>
                  <div className="w-1/3 text-center">{settings.headerCenter}</div>
                  <div className="w-1/3 text-right">{settings.headerRight.replace('{date}', new Date().toLocaleDateString())}</div>
                </div>

                {settings.title && (
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-6 font-sans">
                    {settings.title}
                  </h1>
                )}

                <div className="flex-1 prose dark:prose-invert max-w-none text-sm leading-relaxed">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm as any, remarkMath as any]}
                    rehypePlugins={[rehypeKatex as any]}
                  >
                    {markdown}
                  </ReactMarkdown>
                </div>

                {/* Footer Mock */}
                <div className="flex justify-between items-end text-[11px] text-slate-400 font-serif border-t pt-4 mt-8">
                  <div className="w-1/3 text-left">{settings.footerLeft}</div>
                  <div className="w-1/3 text-center">{settings.footerCenter.replace('{page}', '1')}</div>
                  <div className="w-1/3 text-right">{settings.footerRight}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
