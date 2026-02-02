import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { DataTable } from './/DataTable'
import type { Column, Filter } from './DataTable'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"

import { categories, subCategoriesMap, departments } from '@/models/data'

const randomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const randomDate = (year = 2024) => new Date(year, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
const randomAmount = (max: number) => parseFloat((Math.random() * max).toFixed(2))

const formatINR = (value: number) => {
  const absVal = Math.abs(value)
  return `${value < 0 ? "- " : ""}₹${absVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
}

type Receipt = { date: Date; sanctionOrder: string; category: string; amount: number; attachment?: string }
type Expenditure = { date: Date; paymentOrder: string; category: string; subCategory: string; department: string; amount: number; attachment?: string }

const generateReceipts = (count: number): Receipt[] =>
  Array.from({ length: count }, () => ({
    date: randomDate(),
    sanctionOrder: Math.random() > 0.5 ? `${1000 + Math.floor(Math.random() * 9000)}` : `SO-${1000 + Math.floor(Math.random() * 9000)}`,
    category: randomItem(categories),
    amount: randomAmount(100000),
    attachment: Math.random() > 0.5 ? "https://example.com/file.pdf" : undefined
  }))

const generateExpenditures = (count: number): Expenditure[] =>
  Array.from({ length: count }, () => {
    const category = randomItem(categories)
    const subCategories = subCategoriesMap[category]
    return {
      date: randomDate(),
      paymentOrder: Math.random() > 0.5 ? `${1000 + Math.floor(Math.random() * 9000)}` : `PO-${1000 + Math.floor(Math.random() * 9000)}`,
      category,
      subCategory: randomItem(subCategories),
      department: randomItem(departments),
      amount: randomAmount(50000),
      attachment: Math.random() > 0.5 ? "https://example.com/file.pdf" : undefined
    }
  })

const receipts = generateReceipts(100)
const expenditures = generateExpenditures(150)

const receiptColumns: Column<Receipt>[] = [
  {
    key: "date",
    label: "Date",
    sortable: true,
    format: d => d instanceof Date
      ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : String(d)
  },
  { key: "sanctionOrder", label: "Sanction Order", sortable: true },
  { key: "category", label: "Category", sortable: true },
  {
    key: "amount",
    label: "Amount",
    sortable: true,
    className: "text-right",
    format: a => typeof a === "number" ? formatINR(a) : "-"
  },
  {
    key: "attachment",
    label: "Attachment",
    format: url => url
      ? <a href={String(url)} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a>
      : "-"
  }
]

const expenditureColumns: Column<Expenditure>[] = [
  {
    key: "date",
    label: "Date",
    sortable: true,
    format: d => d instanceof Date
      ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : String(d)
  },
  { key: "paymentOrder", label: "Payment Order", sortable: true },
  { key: "category", label: "Category", sortable: true },
  { key: "subCategory", label: "Sub-category", sortable: true },
  { key: "department", label: "Department", sortable: true },
  {
    key: "amount",
    label: "Amount",
    sortable: true,
    className: "text-right",
    format: a => typeof a === "number" ? formatINR(a) : "-"
  },
  {
    key: "attachment",
    label: "Attachment",
    format: url => url
      ? <a href={String(url)} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a>
      : "-"
  }
]

type CategorySummary = {
  category: string
  totalReceipts: number
  totalExpenditure: number
  balance: number
}

const generateCategorySummary = (): CategorySummary[] => {
  return categories.map(category => {
    const totalReceipts = receipts.filter(r => r.category === category).reduce((sum, r) => sum + r.amount, 0)
    const totalExpenditures = expenditures.filter(e => e.category === category).reduce((sum, e) => sum + e.amount, 0)
    return { category, totalReceipts, totalExpenditure: totalExpenditures, balance: totalReceipts - totalExpenditures }
  })
}

const categorySummaryColumns: Column<CategorySummary>[] = [
  { key: "category", label: "Category" },
  { key: "totalReceipts", label: "Total Receipts", className: "text-right", format: val => formatINR(Number(val)) },
  { key: "totalExpenditure", label: "Total Expenditures", className: "text-right", format: val => formatINR(Number(val)) },
  { key: "balance", label: "Balance", className: "text-right", format: val => formatINR(Number(val)) }
]

const allSubCategories = Object.values(subCategoriesMap).flat()

const receiptFilters: Filter<Receipt>[] = [
  { key: "sanctionOrder", type: "text", label: "Sanction Order", placeholder: "Search Sanction Order" },
  { key: "category", type: "select", label: "Category", options: categories },
  { key: "amountMin", type: "number", label: "Min Amount", placeholder: "Min ₹", filterFn: (row, val) => row.amount >= Number(val) },
  { key: "amountMax", type: "number", label: "Max Amount", placeholder: "Max ₹", filterFn: (row, val) => row.amount <= Number(val) },
  { key: "dateFrom", type: "date", label: "From Date", filterFn: (row, val) => row.date >= new Date(val) },
  { key: "dateTo", type: "date", label: "To Date", filterFn: (row, val) => row.date <= new Date(val) }
]

const expenditureFilters: Filter<Expenditure>[] = [
  { key: "paymentOrder", type: "text", label: "Payment Order", placeholder: "Search Payment Order" },
  { key: "category", type: "select", label: "Category", options: categories },
  { key: "subCategory", type: "select", label: "Sub-category" },
  { key: "department", type: "select", label: "Department", options: departments },
  { key: "expenditureMin", type: "number", label: "Min Expenditure", placeholder: "Min ₹", filterFn: (row, val) => row.amount >= Number(val) },
  { key: "expenditureMax", type: "number", label: "Max Expenditure", placeholder: "Max ₹", filterFn: (row, val) => row.amount <= Number(val) },
  { key: "dateFrom", type: "date", label: "From Date", filterFn: (row, val) => row.date >= new Date(val) },
  { key: "dateTo", type: "date", label: "To Date", filterFn: (row, val) => row.date <= new Date(val) }
]

export function Dashboard() {
  const navigate = useNavigate()

  const canModify = true

    return (
        <>
        <div className="flex items-center justify-between pb-4">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          {
            canModify &&
            <div className="flex gap-2">
              <Button onClick={() => navigate("/add")}>
                Add Entry
              </Button>
              <Button variant="destructive" onClick={() => navigate("/remove")}>
                Delete Entry
              </Button>
            </div>
          }
        </div>

        <Accordion type="multiple" defaultValue={["summary"]} className="space-y-4">

            <AccordionItem value="receipts">
            <AccordionTrigger className="text-lg font-semibold hover:no-underline">Receipts</AccordionTrigger>
            <AccordionContent>
                <DataTable
                data={receipts}
                columns={receiptColumns}
                filters={receiptFilters}
                defaultSort="date"
                />
            </AccordionContent>
            </AccordionItem>

            <AccordionItem value="expenditures">
            <AccordionTrigger className="text-lg font-semibold hover:no-underline">Expenditures</AccordionTrigger>
            <AccordionContent>
                <DataTable
                data={expenditures}
                columns={expenditureColumns}
                filters={expenditureFilters}
                defaultSort="date"
                dynamicSelectOptions={{ subCategory: (fv) => fv.category ? subCategoriesMap[fv.category] : allSubCategories }}
                />
            </AccordionContent>
            </AccordionItem>

            <AccordionItem value="summary">
            <AccordionTrigger className="text-lg font-semibold hover:no-underline">Summary</AccordionTrigger>
            <AccordionContent>
                <DataTable
                data={generateCategorySummary()}
                columns={categorySummaryColumns}
                defaultSort="category"
                showResultCount={false}
                performPagination={false}
                />
            </AccordionContent>
            </AccordionItem>

        </Accordion>
        </>
    )
}
