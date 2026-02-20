import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FieldValue = string | number | boolean | Date | null | undefined;

type FieldConfig = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  options?: string[];
  disabled?: boolean;
};

type EditDeleteDialogProps<T> = {
  row: T;
  fields: FieldConfig[];
  onSave: (data: T) => void;
  onDelete: (data: T) => void;
  formatDisplay?: (key: string, value: FieldValue) => string;
};

export function EditDeleteDialog<T extends Record<string, FieldValue>>({
  row,
  fields,
  onSave,
  onDelete,
  formatDisplay,
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
                className="grid grid-cols-4 items-center gap-4"
              >
                <Label htmlFor={field.key}>{field.label}</Label>
                <div className="col-span-3">
                  {field.type === "select" && field.options ? (
                    <Select
                      value={formatValue(field.key, formData[field.key])}
                      onValueChange={(v) => updateField(field.key, v)}
                      disabled={field.disabled}
                    >
                      <SelectTrigger>
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
