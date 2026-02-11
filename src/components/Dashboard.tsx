import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from './/DataTable'
import type { Column, Filter } from './DataTable'

import { categories, subCategoriesMap, departments } from '@/models/data'

const randomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const randomDate = (year = 2024) => new Date(year, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
const randomAmount = (max: number) => parseFloat((Math.random() * max).toFixed(2))

const formatINR = (value: number) => {
  const absVal = Math.abs(value)
  return `${value < 0 ? "- " : ""}₹${absVal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
}

type Receipt = { date: Date; sanctionOrder: string; category: string; amount: number; attachment?: string }
type Expenditure = { date: Date; billNo: string; voucherNo: string; category: string; subCategory: string; department: string; amount: number; attachment?: string }

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
      billNo: Math.random() > 0.5 ? `${1000 + Math.floor(Math.random() * 9000)}` : `BN-${1000 + Math.floor(Math.random() * 9000)}`,
      voucherNo: Math.random() > 0.5 ? `${1000 + Math.floor(Math.random() * 9000)}` : `VN-${1000 + Math.floor(Math.random() * 9000)}`,
      category,
      subCategory: randomItem(subCategories),
      department: category === "OH-35 Grants for Creation of Capital Assets"
        ? randomItem(departments.slice(1))
        : "-",
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
  { key: "category", label: "OH Category", sortable: true },
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
  { key: "billNo", label: "Bill No.", sortable: true },
  { key: "voucherNo", label: "Voucher No.", sortable: true },
  { key: "category", label: "OH Category", sortable: true },
  { key: "subCategory", label: "OH Sub-category", sortable: true },
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

type SubCategorySummary = {
  subCategory: string
  totalReceipts: number
  totalExpenditure: number
  balance: number
}

type CategorySummary = {
  category: string
  totalReceipts: number
  totalExpenditure: number
  balance: number
  subCategories: SubCategorySummary[]
}

const generateCategorySummary = (): CategorySummary[] => {
  return categories.map(category => {
    const totalReceipts = receipts.filter(r => r.category === category).reduce((sum, r) => sum + r.amount, 0)
    const totalExpenditures = expenditures.filter(e => e.category === category).reduce((sum, e) => sum + e.amount, 0)
    const subs = subCategoriesMap[category] ?? []
    const subCategories: SubCategorySummary[] = subs.map(sub => {
      const subReceipts = 0
      const subExpenditure = expenditures
        .filter(e => e.category === category && e.subCategory === sub)
        .reduce((sum, e) => sum + e.amount, 0)
      return { subCategory: sub, totalReceipts: subReceipts, totalExpenditure: subExpenditure, balance: subReceipts - subExpenditure }
    })
    return { category, totalReceipts, totalExpenditure: totalExpenditures, balance: totalReceipts - totalExpenditures, subCategories }
  })
}

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
  { key: "billNo", type: "text", label: "Bill No.", placeholder: "Search Bill No." },
  { key: "voucherNo", type: "text", label: "Voucher No.", placeholder: "Search Voucher No." },
  { key: "category", type: "select", label: "Category", options: categories },
  { key: "subCategory", type: "select", label: "Sub-category" },
  { key: "expenditureMin", type: "number", label: "Min Expenditure", placeholder: "Min ₹", filterFn: (row, val) => row.amount >= Number(val) },
  { key: "expenditureMax", type: "number", label: "Max Expenditure", placeholder: "Max ₹", filterFn: (row, val) => row.amount <= Number(val) },
  { key: "dateFrom", type: "date", label: "From Date", filterFn: (row, val) => row.date >= new Date(val) },
  { key: "dateTo", type: "date", label: "To Date", filterFn: (row, val) => row.date <= new Date(val) }
]

type Tab = "receipts" | "expenditures" | "summary"

const tabs: { value: Tab; label: string }[] = [
  { value: "summary", label: "Summary" },
  { value: "receipts", label: "Receipts" },
  { value: "expenditures", label: "Expenditures" },
]

const summaryCategoryData = generateCategorySummary()

export function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>("summary")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (category: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)

      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }

      return next
    })
  }

  const canModify = true

  return (
    <>
      <div className="flex items-center justify-between pb-4">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        {canModify && (
          <div className="flex gap-2">
            <Button onClick={() => navigate("/add")}>Add Entry</Button>
            <Button variant="destructive" onClick={() => navigate("/remove")}>Delete Entry</Button>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? "default" : "outline"}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "receipts" && (
        <DataTable
          data={receipts}
          columns={receiptColumns}
          filters={receiptFilters}
          defaultSort="date"
        />
      )}

      {activeTab === "expenditures" && (
        <DataTable
          data={expenditures}
          columns={expenditureColumns}
          filters={expenditureFilters}
          defaultSort="date"
          dynamicSelectOptions={{ subCategory: (fv) => fv.category ? subCategoriesMap[fv.category] : allSubCategories }}
        />
      )}

      {activeTab === "summary" && (() => {
        const totalReceipts = summaryCategoryData.reduce((sum, row) => sum + row.totalReceipts, 0)
        const totalExpenditure = summaryCategoryData.reduce((sum, row) => sum + row.totalExpenditure, 0)
        const totalBalance = totalReceipts - totalExpenditure
        const totalPct = totalReceipts > 0
          ? Math.min((totalExpenditure / totalReceipts) * 100, 100)
          : 0
        return (
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium w-8" />
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-right font-medium">Total Receipts</th>
                  <th className="px-4 py-3 text-right font-medium">Total Expenditures</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {summaryCategoryData.map((row) => {
                  const isExpanded = expandedRows.has(row.category)
                  const hasSubCategories = row.subCategories.length > 0
                  const pct = row.totalReceipts > 0
                    ? Math.min((row.totalExpenditure / row.totalReceipts) * 100, 100)
                    : 0
                  return (
                    <>
                      <tr
                        key={row.category}
                        onClick={() => hasSubCategories && toggleRow(row.category)}
                        className={`border-b transition-colors ${hasSubCategories ? "cursor-pointer hover:bg-muted/50" : ""}`}
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {hasSubCategories
                            ? isExpanded
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />
                            : null
                          }
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <div className="mb-1.5">{row.category}</div>
                          {row.balance < 0 ? (
                            <div className="h-1.5 w-full rounded-sm bg-red-700" />
                          ) : (
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-blue-700 transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">{formatINR(row.totalReceipts)}</td>
                        <td className="px-4 py-3 text-right">{formatINR(row.totalExpenditure)}</td>
                        <td className={`px-4 py-3 text-right font-bold ${row.balance < 0 ? "text-red-700" : "text-green-700"}`}>
                          {formatINR(row.balance)}
                        </td>
                      </tr>

                      {isExpanded && row.subCategories.map((sub) => (
                        <tr key={`${row.category}-${sub.subCategory}`} className="border-b bg-muted/20">
                          <td className="px-4 py-2" />
                          <td className="px-4 py-2 pl-8 text-muted-foreground">{sub.subCategory}</td>
                          <td className="px-4 py-2 text-right text-muted-foreground">—</td>
                          <td className="px-4 py-2 text-right text-muted-foreground">{formatINR(sub.totalExpenditure)}</td>
                          <td className={`px-4 py-2 text-right text-muted-foreground`}>
                            {sub.totalExpenditure > 0 ? formatINR(-sub.totalExpenditure) : "—"}
                          </td>
                        </tr>
                      ))}
                    </>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/50">
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 font-bold">
                    <div className="mb-1.5">Total</div>
                    {totalBalance < 0 ? (
                      <div className="h-1.5 w-full rounded-sm bg-red-700" />
                    ) : (
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-700 transition-all duration-300"
                          style={{ width: `${totalPct}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{formatINR(totalReceipts)}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatINR(totalExpenditure)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${totalBalance < 0 ? "text-red-700" : "text-green-700"}`}>
                    {formatINR(totalBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )
      })()}
    </>
  )
}
