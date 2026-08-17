import { Link, useLocation } from "wouter";
import { BookText, Github, Linkedin, Mail, Settings, History } from "lucide-react";
import React from "react";
import { ProfileModal } from "@/components/ProfileModal";
import { HistoryDrawer } from "@/components/HistoryDrawer";
export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <BookText className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg tracking-tight">NotebookForge</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link 
              href="/" 
              className={`transition-colors hover:text-primary ${location === '/' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              Convert
            </Link>
            <Link 
              href="/about" 
              className={`transition-colors hover:text-primary ${location === '/about' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              About
            </Link>
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-1 hover:text-primary transition-colors"
              aria-label="History"
            >
              <History className="h-5 w-5" />
            </button>
            <button
              onClick={() => setProfileOpen(true)}
              className="p-1 hover:text-primary transition-colors"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 md:px-8 py-8 md:py-12">
        {children}
      </main>

      <footer className="border-t py-8 mt-12 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>
            &copy; {new Date().getFullYear()} NotebookForge. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <a href="mailto:contact@example.com" className="hover:text-primary transition-colors flex items-center gap-1" data-testid="link-email">
              <Mail className="h-4 w-4" /> Contact
            </a>
            <a href="#" className="hover:text-primary transition-colors flex items-center gap-1" data-testid="link-github">
              <Github className="h-4 w-4" /> GitHub
            </a>
            <a href="#" className="hover:text-primary transition-colors flex items-center gap-1" data-testid="link-linkedin">
              <Linkedin className="h-4 w-4" /> LinkedIn
            </a>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
      <HistoryDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
