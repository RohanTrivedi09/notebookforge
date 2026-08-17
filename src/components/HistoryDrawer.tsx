import React, { useEffect, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { getConversionHistory, clearConversionHistory, ConversionHistoryItem } from '@/lib/localStorage';
import { FileText, Clock, Trash2, History } from 'lucide-react';

export function HistoryDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [history, setHistory] = useState<ConversionHistoryItem[]>([]);

  useEffect(() => {
    if (open) {
      setHistory(getConversionHistory());
    }
  }, [open]);

  const handleClear = () => {
    clearConversionHistory();
    setHistory([]);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-xl mx-auto">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Conversion History
          </DrawerTitle>
          <DrawerDescription>
            Last 10 conversions recorded locally in your browser.
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm space-y-2">
              <Clock className="h-8 w-8 mx-auto opacity-30" />
              <p>No conversions yet. Upload and convert a file to see it here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card/60 hover:bg-muted/30 transition-colors text-sm"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-medium truncate text-foreground">{item.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={history.length === 0}
            className="text-destructive hover:bg-destructive/10 gap-1.5 text-xs"
          >
            <Trash2 className="h-4 w-4" /> Clear History
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
