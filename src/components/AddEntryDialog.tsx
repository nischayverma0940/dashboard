import { useState } from "react"
import { Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type FieldConfig = {
  key: string
  label: string
  type: "text" | "number" | "date" | "select"
  options?: string[]
  required?: boolean
  dependsOn?: string
  getDynamicOptions?: (formData: any) => string[]
}

type AddEntryDialogProps<T> = {
  fields: FieldConfig[]
  onAdd: (data: T) => void
  title: string
  buttonLabel?: string
}

export function AddEntryDialog<T extends Record<string, any>>({
  fields,
  onAdd,
  title,
  buttonLabel = "Add Entry",
}: AddEntryDialogProps<T>) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<T>>({})

  const initializeForm = () => {
    const initialData: any = {}
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
    const processedData: any = {}
    fields.forEach(field => {
      const value = formData[field.key]
      if (field.type === "date" && value) {
        processedData[field.key] = new Date(value as string)
      } else if (field.type === "number") {
        processedData[field.key] = parseFloat(value as string) || 0
      } else {
        processedData[field.key] = value
      }
    })
    
    onAdd(processedData as T)
    setOpen(false)
    setFormData({})
  }

  const updateField = (key: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [key]: value }
      
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new entry
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {fields.map(field => (
            <div key={field.key} className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={field.key}>
                {field.label}
              </Label>
              <div className="col-span-3">
                {field.type === "select" ? (
                  <Select
                    value={String(formData[field.key] ?? "")}
                    onValueChange={v => updateField(field.key, v)}
                    disabled={isFieldDisabled(field)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${field.label}`} />
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
                  />
                ) : field.type === "number" ? (
                  <Input
                    id={field.key}
                    type="number"
                    step="0.01"
                    value={String(formData[field.key] ?? "")}
                    onChange={e => updateField(field.key, e.target.value)}
                    placeholder={`Enter ${field.label}`}
                  />
                ) : (
                  <Input
                    id={field.key}
                    type="text"
                    value={String(formData[field.key] ?? "")}
                    onChange={e => updateField(field.key, e.target.value)}
                    placeholder={`Enter ${field.label}`}
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
