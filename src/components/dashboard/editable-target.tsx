"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EditableTargetProps {
  value: number;
  label: string;
  onSave: (value: number) => Promise<void>;
  min?: number;
  max?: number;
  isPending?: boolean;
}

export function EditableTarget({
  value,
  label,
  onSave,
  min = 1,
  max = 1000,
  isPending = false,
}: EditableTargetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const numValue = parseInt(editValue);
    if (isNaN(numValue) || numValue < min || numValue > max) {
      toast.error(`Please enter a number between ${min} and ${max}`);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(numValue);
      toast.success(`${label} target updated!`);
      setIsOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update target");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value.toString());
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-1 text-foreground font-medium hover:text-primary transition-colors group"
          onClick={() => setEditValue(value.toString())}
        >
          <span>{value}</span>
          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3" align="start">
        <div className="space-y-3">
          <p className="text-sm font-medium">{label} Target</p>
          <Input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            min={min}
            max={max}
            className="h-9"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1 h-8"
              onClick={handleSave}
              disabled={isSaving || isPending}
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Check className="h-3 w-3 mr-1" />
              )}
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Simplified inline target display with edit capability
export function InlineEditableTarget({
  value,
  suffix = "",
  onSave,
  isPending = false,
}: {
  value: number;
  suffix?: string;
  onSave: (value: number) => Promise<void>;
  isPending?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const numValue = parseInt(editValue);
    if (isNaN(numValue) || numValue < 1) {
      setEditValue(value.toString());
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(numValue);
      setIsEditing(false);
    } catch (error) {
      setEditValue(value.toString());
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <input
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setEditValue(value.toString());
            setIsEditing(false);
          }
        }}
        className="w-16 h-6 text-sm font-medium bg-transparent border-b border-primary outline-none text-center"
        autoFocus
        disabled={isSaving}
      />
    );
  }

  return (
    <button
      onClick={() => {
        setEditValue(value.toString());
        setIsEditing(true);
      }}
      className="font-medium text-foreground hover:text-primary transition-colors border-b border-transparent hover:border-primary"
      disabled={isPending}
    >
      {value}{suffix}
    </button>
  );
}
