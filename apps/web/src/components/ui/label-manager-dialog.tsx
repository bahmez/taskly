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
import { Plus, Check, Edit3, Trash2, X, Search } from 'lucide-react';

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
  const [search, setSearch] = React.useState('');
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

  const filteredLabels = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableLabels;
    return availableLabels.filter((l) => l.name.toLowerCase().includes(q));
  }, [availableLabels, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf] max-w-md p-0 overflow-hidden">
        <DialogHeader>
          <div className="px-5 pt-5">
            <DialogTitle>Labels</DialogTitle>
            <div className="text-xs text-[#9fadbc] mt-1">Select a label to add/remove it from the card.</div>
          </div>
        </DialogHeader>

        <div className="px-5 pb-5">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9fadbc]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search labels..."
              className="pl-10 bg-[#282e33] border-[#9fadbc29]"
            />
          </div>

          <div className="max-h-[52vh] overflow-y-auto pr-2 pb-6 space-y-2">
            {/* Existing labels */}
            {filteredLabels.length === 0 ? (
              <div className="text-center py-8 text-[#9fadbc] text-sm">No labels found</div>
            ) : (
              filteredLabels.map((label) => {
            const isSelected = selectedLabelIds.includes(label.id);
            const isEditing = editingId === label.id;

            return (
              <div
                key={label.id}
                className="flex items-center gap-2 group"
              >
                {isEditing ? (
                  <>
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        className="h-9 w-16 rounded-md shrink-0 border border-[#9fadbc29] overflow-hidden"
                        style={{ backgroundColor: editLabelColor }}
                        onClick={() => {
                          // no-op; color picker below
                        }}
                        aria-label="Label color preview"
                      />
                      <Input
                        autoFocus
                        value={editLabelName}
                        onChange={(e) => setEditLabelName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate(label.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 bg-[#282e33] border-[#9fadbc29]"
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
                        'flex-1 flex items-center gap-3 p-2 rounded-md border transition-all bg-[#282e33] min-w-0',
                        isSelected
                          ? 'border-[#0c66e4] bg-[#0c66e4] bg-opacity-10'
                          : 'border-[#9fadbc29] hover:border-[#0c66e4]'
                      )}
                    >
                      <div
                        className="h-8 w-16 rounded-md shrink-0 shadow-sm"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="flex-1 text-left font-medium truncate">{label.name}</span>
                      {isSelected && (
                        <Check className="h-5 w-5 text-[#0c66e4] shrink-0" />
                      )}
                    </button>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(label)}
                        className="h-9 w-9 p-0"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteLabel(label.id)}
                        className="h-9 w-9 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
              })
            )}

            {/* Create new label */}
            <div className="pt-4 mt-4 border-t border-[#9fadbc29]">
              {isCreating ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-9 w-16 rounded-md border border-[#9fadbc29] shadow-sm"
                      style={{ backgroundColor: newLabelColor }}
                    />
                    <Input
                      autoFocus
                      placeholder="New label name"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreate();
                        if (e.key === 'Escape') setIsCreating(false);
                      }}
                      className="flex-1 bg-[#282e33] border-[#9fadbc29]"
                    />
                    <Button size="sm" variant="trello" onClick={handleCreate} disabled={!newLabelName.trim()}>
                      Create
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsCreating(false);
                        setNewLabelName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewLabelColor(color)}
                        className={cn(
                          'h-7 w-7 rounded-md transition-transform hover:scale-110',
                          newLabelColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1d2125]' : '',
                        )}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                    <input
                      type="color"
                      value={newLabelColor}
                      onChange={(e) => setNewLabelColor(e.target.value)}
                      className="h-7 w-7 rounded-md cursor-pointer border border-[#9fadbc29] bg-transparent p-0"
                      aria-label="Custom color"
                    />
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm h-10 bg-[#282e33] border border-[#9fadbc29] hover:border-[#0c66e4]"
                  onClick={() => setIsCreating(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create new label
                </Button>
              )}

              {/* Color palette for edit mode */}
              {editingId && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditLabelColor(color)}
                      className={cn(
                        'h-7 w-7 rounded-md transition-transform hover:scale-110',
                        editLabelColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1d2125]' : '',
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={editLabelColor}
                    onChange={(e) => setEditLabelColor(e.target.value)}
                    className="h-7 w-7 rounded-md cursor-pointer border border-[#9fadbc29] bg-transparent p-0"
                    aria-label="Custom color"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

