import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

type EntryType = "receipt" | "expenditure"

export function RemoveEntryForm() {
  const navigate = useNavigate()

  const [entryType, setEntryType] = useState<EntryType | "">("")
  const [orderNo, setOrderNo] = useState("")
  const [open, setOpen] = useState(false)

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault()

    if (!entryType || !orderNo) return
    setOpen(true)
  }

  const confirmDelete = () => {
    console.log("Deleted:", { entryType, orderNo })
    setOpen(false)
    navigate("/")
  }

  return (
    <>
      <form
        onSubmit={handleLookup}
        className="mx-auto w-full px-2 sm:px-4 lg:px-8 xl:px-16 max-w-lg"
      >
        <h1 className="flex justify-center text-4xl font-bold pb-4">
          Delete Entry
        </h1>

        <div className="mb-4 w-full">
            <Button className="max-w-fit px-0 hover:bg-white" variant="ghost" onClick={() => navigate("/")}>
                ‹ Back
            </Button>
        </div>

        <FieldGroup className="flex flex-col gap-4">
          <Field className="gap-1">
            <FieldLabel className="text-xs">Entry Type</FieldLabel>
            <Select
              required
              value={entryType}
              onValueChange={(v) => setEntryType(v as EntryType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="expenditure">Expenditure</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field className="gap-1">
            <FieldLabel className="text-xs">
              Sanction / Payment Order
            </FieldLabel>
            <Input
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              required
            />
          </Field>

          <Button type="submit" className="w-full bg-black">
            Fetch Details
          </Button>
        </FieldGroup>
      </form>

      {/* Confirmation Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>

          <p className="text-sm">
            Are you sure you want to delete Order No. <b>{orderNo}</b>?
          </p>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
