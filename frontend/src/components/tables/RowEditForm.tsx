"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { deepEqual } from "fast-equals"; // or use lodash.isequal if preferred

type FieldType = "text" | "number" | "date";

type FieldConfig<T> = {
  key: keyof T;
  label: string;
  type?: FieldType;
};

type RowEditFormProps<T> = {
  item: T;
  fields: FieldConfig<T>[];
  onSubmit: (updated: T) => void;
  onCancel: () => void;
};

export function RowEditForm<T>({
  item,
  fields,
  onSubmit,
  onCancel,
}: RowEditFormProps<T>) {
  const [form, setForm] = useState<T>({ ...item });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleChange = (key: keyof T, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const hasChanges = !deepEqual(item, form);

  const handleCancel = () => {
    if (hasChanges) {
      setShowConfirmDialog(true);
    } else {
      onCancel();
    }
  };

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
        className="space-y-6 p-4 bg-white rounded-2xl shadow-md border border-gray-200"
      >
        {fields.map((field) => (
          <div key={String(field.key)} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
            </label>
            <Input
              type={field.type || "text"}
              value={String(form[field.key] ?? "")}
              onChange={(e) =>
                handleChange(
                  field.key,
                  field.type === "number"
                    ? parseFloat(e.target.value)
                    : e.target.value
                )
              }
              className="bg-muted border border-input focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        ))}

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            className="bg-primary text-white hover:bg-primary/90 cursor-pointer"
          >
            Save
          </Button>
        </div>
      </form>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to exit without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={onCancel}
              className="bg-destructive text-white hover:bg-destructive/90 cursor-pointer"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
