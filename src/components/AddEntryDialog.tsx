import { useState } from "react"
import { Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type FieldValue = string | number | Date | File

type FieldConfig = {
  key: string
  label: string
  type: "text" | "number" | "date" | "select" | "file"
  options?: string[]
  required?: boolean
  dependsOn?: string
  getDynamicOptions?: (formData: Record<string, FieldValue>) => string[]
}

type AddEntryDialogProps<T> = {
  fields: FieldConfig[]
  onAdd: (data: T) => void
  title: string
  buttonLabel?: string
}

export function AddEntryDialog<T extends Record<string, FieldValue>>({
  fields,
  onAdd,
  title,
  buttonLabel = "Add Entry",
}: AddEntryDialogProps<T>) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<Record<string, FieldValue>>({})

  const initializeForm = () => {
    const initialData: Record<string, FieldValue> = {}
    fields.forEach(field => {
      if (field.type === "date") {
        initialData[field.key] = new Date().toISOString().split('T')[0]
      } else if (field.type === "number") {
        initialData[field.key] = 0
      } else {
        initialData[field.key] = ""
      }
    })
    setFormData(initialData)
  }

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      initializeForm()
    }
  }

  const handleAdd = () => {
    const processedData: Record<string, FieldValue> = {}
    fields.forEach(field => {
      const value = formData[field.key]
      if (field.type === "date" && value) {
        processedData[field.key] = new Date(value as string)
      } else if (field.type === "number") {
        processedData[field.key] = parseFloat(value as string) || 0
      } else if (field.type === "file") {
        processedData[field.key] = value ?? ""
      } else {
        processedData[field.key] = value
      }
    })

    onAdd(processedData as T)
    setOpen(false)
    setFormData({})
  }

  const updateField = (key: string, value: FieldValue) => {
    setFormData(prev => {
      const updated: Record<string, FieldValue> = { ...prev, [key]: value }

      fields.forEach(field => {
        if (field.dependsOn === key) {
          updated[field.key] = ""
        }
      })

      return updated
    })
  }

  const getFieldOptions = (field: FieldConfig): string[] => {
    if (field.getDynamicOptions) {
      return field.getDynamicOptions(formData)
    }
    return field.options || []
  }

  const isFieldDisabled = (field: FieldConfig): boolean => {
    if (field.dependsOn) {
      return !formData[field.dependsOn]
    }
    return false
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-x-clip overflow-y-auto flex flex-col items-center">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new entry
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {fields.map(field => (
            <div key={field.key} className="flex flex-col sm:grid sm:grid-cols-4 sm:items-center gap-2 sm:gap-4">
              <Label htmlFor={field.key} className="sm:text-right">
                {field.label}
              </Label>
              <div className="sm:col-span-3 min-w-0 overflow-hidden">
                {field.type === "select" ? (
                  <Select
                    value={String(formData[field.key] ?? "")}
                    onValueChange={v => updateField(field.key, v)}
                    disabled={isFieldDisabled(field)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="" />
                    </SelectTrigger>
                    <SelectContent>
                      {getFieldOptions(field).map(opt => (
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
                    value={String(formData[field.key] ?? "")}
                    onChange={e => updateField(field.key, e.target.value)}
                    className="w-full min-w-0 max-w-full appearance-none"
                  />
                ) : field.type === "number" ? (
                  <Input
                    id={field.key}
                    type="number"
                    step="0.01"
                    value={String(formData[field.key] ?? "")}
                    onChange={e => updateField(field.key, e.target.value)}
                    placeholder=""
                  />
                ) : field.type === "file" ? (
                  <Input
                    id={field.key}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={e => updateField(field.key, e.target.files?.[0] ?? "")}
                    className="cursor-pointer"
                  />
                ) : (
                  <Input
                    id={field.key}
                    type="text"
                    value={String(formData[field.key] ?? "")}
                    onChange={e => updateField(field.key, e.target.value)}
                    placeholder=""
                  />
                )}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>Add Entry</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
