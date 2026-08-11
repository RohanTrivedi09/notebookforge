import React from 'react';
import { CheckCircle2, Check, FileType, Code2, FileText, Zap, Shield, Settings2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">About NotebookForge</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          The cleanest, fastest, and most secure way to convert your Jupyter Notebooks into professional Word documents.
        </p>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <Card className="border-primary/20 shadow-sm">
          <CardHeader>
            <FileType className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Markdown Cells</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Fully supports headings, bold, and italic text formatting natively translated into Word styles.
          </CardContent>
        </Card>
        <Card className="border-primary/20 shadow-sm">
          <CardHeader>
            <Code2 className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Code Cells</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Automatic syntax highlighting for Python keywords, strings, and comments. Stream outputs and error traces included.
          </CardContent>
        </Card>
        <Card className="border-primary/20 shadow-sm">
          <CardHeader>
            <FileText className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Word Export</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Generates a clean, native .docx file with your custom headers, footers, and page numbers.
          </CardContent>
        </Card>
      </section>

      <section className="grid md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Current Features</h2>
          <ul className="space-y-3">
            {[
              "Instant in-browser conversion (no server required)",
              "Privacy first: files never leave your device",
              "Customizable document headers and footers",
              "Automatic Python syntax highlighting",
              "Heading and basic markdown formatting support",
              "Jupyter error traceback formatting"
            ].map((feature, i) => (
              <li key={i} className="flex items-start gap-3 text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Planned Features</h2>
          <ul className="space-y-3">
            {[
              "Image and plot rendering",
              "LaTeX math formula support",
              "Complex markdown (Tables, Lists, Links)",
              "PDF and HTML export options",
              "Batch notebook conversion",
              "Custom Word styling themes"
            ].map((feature, i) => (
              <li key={i} className="flex items-start gap-3 text-muted-foreground">
                <div className="h-5 w-5 rounded-full border-2 border-muted flex items-center justify-center shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                </div>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-center mb-8">Why Choose NotebookForge?</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Lightning Fast</h3>
            <p className="text-sm text-muted-foreground">No queues, no uploads. Conversion happens directly in your browser's memory in milliseconds.</p>
          </div>
          <div className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Secure & Private</h3>
            <p className="text-sm text-muted-foreground">Your code and data are sensitive. Because everything runs locally, you never risk exposing secrets.</p>
          </div>
          <div className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Settings2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Fully Customizable</h3>
            <p className="text-sm text-muted-foreground">Tweak the document output to match your university's or company's exact submission standards.</p>
          </div>
        </div>
      </section>

    </div>
  );
}
