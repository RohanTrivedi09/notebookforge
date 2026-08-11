import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getSnitchUser, setSnitchUser, SnitchUser } from '@/lib/localStorage';

export function ProfileModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [user, setUser] = useState<SnitchUser | null>(null);
  const [name, setName] = useState('');
  const [header, setHeader] = useState('');
  const [footer, setFooter] = useState('');

  useEffect(() => {
    const stored = getSnitchUser();
    setUser(stored);
    if (stored) {
      setName(stored.name);
      setHeader(stored.defaultHeader ?? '');
      setFooter(stored.defaultFooter ?? '');
    }
  }, []);

  const handleSave = () => {
    const newUser: SnitchUser = { name, defaultHeader: header, defaultFooter: footer };
    setSnitchUser(newUser);
    setUser(newUser);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? 'Edit Profile' : 'Welcome to NotebookForge'}</DialogTitle>
          <DialogDescription>{user ? 'Update your preferences' : 'Enter your name to get started'}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right" htmlFor="name">Name</label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right" htmlFor="header">Default Header</label>
            <Input id="header" value={header} onChange={e => setHeader(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-right" htmlFor="footer">Default Footer</label>
            <Input id="footer" value={footer} onChange={e => setFooter(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
