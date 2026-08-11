import React, { useEffect, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { getConversionHistory, clearConversionHistory } from '@/lib/localStorage';

export function HistoryDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [history, setHistory] = useState([] as any[]);

  useEffect(() => {
    setHistory(getConversionHistory());
  }, [open]);

  const handleClear = () => {
    clearConversionHistory();
    setHistory([]);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>My Conversions</DrawerTitle>
          <DrawerDescription>Last 10 conversions saved locally.</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-muted-foreground">No recent conversions.</p>
          ) : (
            <ul className="list-disc list-inside">
              {history.map((h, i) => (
                <li key={i}>
                  {h.filename} – {new Date(h.timestamp).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-4 flex justify-end space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="destructive" onClick={handleClear}>
            Clear History
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
