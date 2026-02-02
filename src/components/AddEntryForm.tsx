import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { subCategoriesMap, departments, categoryType } from "@/models/data"

type EntryType = "receipt" | "expenditure"
type RecurringType = "Recurring" | "Non-Recurring"

const formatINR = (value: string | number) => {
  if (!value) return ""
  const num = typeof value === "number" ? value : Number(value.toString().replace(/,/g, ""))
  if (isNaN(num)) return ""
  return new Intl.NumberFormat("en-IN").format(num)
}

export function AddEntryForm() {
  const navigate = useNavigate()

  const [entryType, setEntryType] = useState<EntryType | "">("")
  const [recurringType, setRecurringType] = useState<RecurringType | "">("")
  const [category, setCategory] = useState("")
  const [subCategory, setSubCategory] = useState("")
  const [department, setDepartment] = useState("Not Applicable")
  const [orderNo, setOrderNo] = useState("")
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0])

  const [amount, setAmount] = useState("")
  const [displayAmount, setDisplayAmount] = useState("")
  const [isFocused, setIsFocused] = useState(false)

  const filteredCategories = useMemo(() => {
    if (!recurringType) return []
    return categoryType[recurringType]
  }, [recurringType])

  const subCategories = useMemo(() => {
    return subCategoriesMap[category] || []
  }, [category])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const formData = {
      entryType,
      recurringType,
      category,
      subCategory: entryType === "expenditure" ? subCategory : null,
      department: entryType === "expenditure" ? department : null,
      orderNo,
      amount: Number(amount.replace(/,/g, "")),
      date,
    }

    console.log(formData)
    navigate("/")
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full px-2 sm:px-4 lg:px-8 xl:px-16 max-w-lg">
      <h1 className="flex flex-row justify-center text-4xl font-bold pb-4">Add Entry</h1>

      <div className="mb-4 w-full">
        <Button className="max-w-fit px-0 hover:bg-white" variant="ghost" onClick={() => navigate("/")}>
          ‹ Back
        </Button>
      </div>

      <FieldGroup className="flex flex-col gap-4">
        <Field className="gap-1">
          <FieldLabel className="text-xs">Entry Type</FieldLabel>
          <Select required onValueChange={(v) => setEntryType(v as EntryType)} value={entryType}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="receipt">Receipt</SelectItem>
              <SelectItem value="expenditure">Expenditure</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field className="gap-1">
          <FieldLabel className="text-xs">Recurring Type</FieldLabel>
          <Select required onValueChange={(v) => {
            setRecurringType(v as RecurringType)
            setCategory("")
          }} value={recurringType}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Recurring">Recurring</SelectItem>
              <SelectItem value="Non-Recurring">Non-Recurring</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field className="gap-1">
          <FieldLabel className="text-xs">OH Category</FieldLabel>
          <Select required onValueChange={setCategory} value={category}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {filteredCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {entryType === "expenditure" && (
          <Field className="gap-1">
            <FieldLabel className="text-xs">Sub Category</FieldLabel>
            <Select required onValueChange={setSubCategory} value={subCategory}>
              <SelectTrigger><SelectValue placeholder="Select sub category" /></SelectTrigger>
              <SelectContent>
                {subCategories.map((sub) => (
                  <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        {entryType === "expenditure" && (
          <Field className="gap-1">
            <FieldLabel className="text-xs">Department</FieldLabel>
            <Select required onValueChange={setDepartment} value={department}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <Field className="gap-1">
          <FieldLabel className="text-xs">Sanction / Payment Order</FieldLabel>
          <Input value={orderNo} onChange={(e) => setOrderNo(e.target.value)} required />
        </Field>

        <Field className="gap-1">
          <FieldLabel className="text-xs">Amount (INR)</FieldLabel>
          <Input
            type="text"
            value={isFocused ? amount : displayAmount}
            onFocus={() => {
              setIsFocused(true)
              setDisplayAmount(amount)
            }}
            onBlur={() => {
              setIsFocused(false)
              setDisplayAmount(formatINR(amount))
            }}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9.]/g, "")
              setAmount(raw)
            }}
            required
          />
        </Field>

        <Field className="gap-1">
          <FieldLabel className="text-xs">Attachment (Optional)</FieldLabel>
          <Input type="file" />
        </Field>

        <Field className="gap-1">
          <FieldLabel className="text-xs">Date</FieldLabel>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <Button type="submit" className="w-full">Add Entry</Button>

      </FieldGroup>
    </form>
  )
}
