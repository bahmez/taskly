'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Button,
  cn,
} from '@taskly/ui';
import { Plus, Check, Edit3, Trash2, X } from 'lucide-react';

interface Label {
  id: string;
  name: string;
  color: string;
}

interface LabelManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableLabels: Label[];
  selectedLabelIds: string[];
  onToggleLabel: (labelId: string, isSelected: boolean) => void;
  onCreateLabel: (name: string, color: string) => void;
  onUpdateLabel: (labelId: string, name: string, color: string) => void;
  onDeleteLabel: (labelId: string) => void;
}

const DEFAULT_COLORS = [
  '#61bd4f', '#f2d600', '#ff9f1a', '#eb5a46', '#c377e0',
  '#0079bf', '#00c2e0', '#51e898', '#ff78cb', '#344563',
];

export function LabelManagerDialog({
  open,
  onOpenChange,
  availableLabels,
  selectedLabelIds,
  onToggleLabel,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
}: LabelManagerDialogProps) {
  const [isCreating, setIsCreating] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [newLabelName, setNewLabelName] = React.useState('');
  const [newLabelColor, setNewLabelColor] = React.useState(DEFAULT_COLORS[0]!);
  const [editLabelName, setEditLabelName] = React.useState('');
  const [editLabelColor, setEditLabelColor] = React.useState('');

  const handleCreate = () => {
    if (newLabelName.trim()) {
      onCreateLabel(newLabelName.trim(), newLabelColor);
      setNewLabelName('');
      setNewLabelColor(DEFAULT_COLORS[0]!);
      setIsCreating(false);
    }
  };

  const handleUpdate = (labelId: string) => {
    if (editLabelName.trim()) {
      onUpdateLabel(labelId, editLabelName.trim(), editLabelColor);
      setEditingId(null);
    }
  };

  const startEdit = (label: Label) => {
    setEditingId(label.id);
    setEditLabelName(label.name);
    setEditLabelColor(label.color);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf] max-w-md">
        <DialogHeader>
          <DialogTitle>Labels</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 pb-4">
          {/* Existing labels */}
          {availableLabels.map((label) => {
            const isSelected = selectedLabelIds.includes(label.id);
            const isEditing = editingId === label.id;

            return (
              <div
                key={label.id}
                className="flex items-center gap-2 group"
              >
                {isEditing ? (
                  <>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={editLabelColor}
                        onChange={(e) => setEditLabelColor(e.target.value)}
                        className="h-9 w-12 rounded cursor-pointer"
                      />
                      <Input
                        autoFocus
                        value={editLabelName}
                        onChange={(e) => setEditLabelName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate(label.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUpdate(label.id)}
                      disabled={!editLabelName.trim()}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onToggleLabel(label.id, isSelected)}
                      className={cn(
                        'flex-1 flex items-center gap-3 p-2 rounded-lg border transition-all',
                        isSelected
                          ? 'border-[#0c66e4] bg-[#0c66e4] bg-opacity-10'
                          : 'border-[#9fadbc29] hover:border-[#0c66e4]'
                      )}
                    >
                      <div
                        className="h-8 w-16 rounded-md shrink-0 shadow-sm"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="flex-1 text-left font-medium">{label.name}</span>
                      {isSelected && (
                        <Check className="h-5 w-5 text-[#0c66e4] shrink-0" />
                      )}
                    </button>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(label)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteLabel(label.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Create new label */}
          {isCreating ? (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-[#0c66e4] bg-[#282e33]">
              <input
                type="color"
                value={newLabelColor}
                onChange={(e) => setNewLabelColor(e.target.value)}
                className="h-9 w-12 rounded cursor-pointer"
              />
              <Input
                autoFocus
                placeholder="Label name"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') setIsCreating(false);
                }}
                className="flex-1"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCreate}
                disabled={!newLabelName.trim()}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsCreating(false);
                  setNewLabelName('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start text-sm h-10 border border-dashed border-[#9fadbc29] hover:border-[#0c66e4]"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create a new label
            </Button>
          )}

          {/* Color palette for quick selection */}
          {(isCreating || editingId) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#9fadbc29]">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    if (isCreating) setNewLabelColor(color);
                    if (editingId) setEditLabelColor(color);
                  }}
                  className={cn(
                    'h-8 w-8 rounded-md transition-transform hover:scale-110',
                    (isCreating && newLabelColor === color) || (editingId && editLabelColor === color)
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1d2125]'
                      : ''
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

