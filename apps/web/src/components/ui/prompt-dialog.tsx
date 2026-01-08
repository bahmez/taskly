'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
} from '@taskly/ui';

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void;
}

export function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  placeholder,
  defaultValue = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
}: PromptDialogProps) {
  const [value, setValue] = React.useState(defaultValue);

  React.useEffect(() => {
    if (open) {
      setValue(defaultValue);
    }
  }, [open, defaultValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf] max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription className="text-[#9fadbc]">{description}</DialogDescription>}
        </DialogHeader>
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) {
              onConfirm(value.trim());
              onOpenChange(false);
            }
          }}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {cancelText}
          </Button>
          <Button
            variant="trello"
            disabled={!value.trim()}
            onClick={() => {
              if (value.trim()) {
                onConfirm(value.trim());
                onOpenChange(false);
              }
            }}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

