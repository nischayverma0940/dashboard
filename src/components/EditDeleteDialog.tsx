import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type FieldValue = string | number | boolean | Date | File | null | undefined;

type FieldConfig = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "file";
  options?: string[];
  disabled?: boolean;
};

type EditDeleteDialogProps<T> = {
  row: T;
  fields: FieldConfig[];
  onSave: (data: T) => void;
  onDelete: (data: T) => void;
  formatDisplay?: (key: string, value: FieldValue) => string;
  getAttachmentViewUrl?: (path: string) => string;
};

export function EditDeleteDialog<T extends Record<string, FieldValue>>({
  row,
  fields,
  onSave,
  onDelete,
  formatDisplay,
  getAttachmentViewUrl,
}: EditDeleteDialogProps<T>) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formData, setFormData] = useState<T>(row);

  const handleEdit = () => {
    setFormData(row);
    setEditOpen(true);
  };

  const handleSave = () => {
    onSave(formData);
    setEditOpen(false);
  };

  const handleDelete = () => {
    onDelete(row);
    setDeleteOpen(false);
  };

  const updateField = (key: string, value: FieldValue) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const formatValue = (key: string, value: FieldValue) => {
    if (formatDisplay) return formatDisplay(key, value);
    if (value instanceof Date) {
      return value.toISOString().split("T")[0];
    }
    if (value instanceof File) return value.name;
    return String(value ?? "");
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEdit}
          className="h-4 w-4 p-0"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-x-clip overflow-y-auto flex flex-col items-center">
          <DialogHeader>
            <DialogTitle>Edit Entry</DialogTitle>
            <DialogDescription>
              Make changes to the entry below
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {fields.map((field) => (
              <div
                key={field.key}
                className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4"
              >
                <Label htmlFor={field.key}>{field.label}</Label>
                <div className="sm:col-span-3 min-w-0 overflow-hidden">
                  {field.type === "select" && field.options ? (
                    <Select
                      value={formatValue(field.key, formData[field.key])}
                      onValueChange={(v) => updateField(field.key, v)}
                      disabled={field.disabled}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === "date" ? (
                    <Input
                      id={field.key}
                      type="date"
                      value={formatValue(field.key, formData[field.key])}
                      onChange={(e) =>
                        updateField(field.key, new Date(e.target.value))
                      }
                      disabled={field.disabled}
                      className="w-full min-w-0 max-w-full appearance-none"
                    />
                  ) : field.type === "number" ? (
                    <Input
                      id={field.key}
                      type="number"
                      step="0.01"
                      value={formatValue(field.key, formData[field.key])}
                      onChange={(e) =>
                        updateField(field.key, parseFloat(e.target.value) || 0)
                      }
                      disabled={field.disabled}
                    />
                  ) : field.type === "file" ? (
                    <div className="space-y-2">
                      {formData[field.key] && typeof formData[field.key] === "string" && formData[field.key] !== "" && (
                        <p className="text-sm text-muted-foreground">
                          Current:{" "}
                          {getAttachmentViewUrl ? (
                            <a
                              href={getAttachmentViewUrl(formData[field.key] as string)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline"
                            >
                              View
                            </a>
                          ) : (
                            "on file"
                          )}
                        </p>
                      )}
                      <Input
                        id={field.key}
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) updateField(field.key, f);
                        }}
                        className="cursor-pointer"
                        disabled={field.disabled}
                      />
                    </div>
                  ) : (
                    <Input
                      id={field.key}
                      type="text"
                      value={formatValue(field.key, formData[field.key])}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      disabled={field.disabled}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this entry? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
