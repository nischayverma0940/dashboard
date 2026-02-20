import * as XLSX from "xlsx"
import React, { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { ChevronDown, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable } from "./DataTable"
import type { Column } from "./DataTable"
import { EditDeleteDialog } from "./EditDeleteDialog"
import { AddEntryDialog } from "./AddEntryDialog"
import type { LabelProps } from "recharts"
import { Bar, BarChart, Cell, XAxis, PieChart, Pie, Tooltip as RechartsTooltip } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { categories, subCategoriesMap, departments } from "@/models/data"
import type { FieldValue } from "./EditDeleteDialog"

type Scale = "absolute" | "thousands" | "lakhs" | "crores"
type Tab = "summary" | "allocations" | "receipts" | "expenditures" | "reports"

type Receipt = {
  date: Date
  sanctionOrder: string
  category: string
  amount: number
  attachment?: string
}

type AllocationCategoryAmount = {
  category: string
  allocatedAmount: number
}

type Allocation = {
  date: Date
  allocationNumber: string
  categoryAmounts: AllocationCategoryAmount[]
}

type AllocationFlat = {
  _index: number
  date: Date
  allocationNumber: string
  [key: string]: string | number | Date | undefined
}

type Expenditure = {
  date: Date
  billNo: string
  voucherNo: string
  category: string
  subCategory: string
  department: string
  amount: number
  attachment?: string
}

type SubCategorySummary = {
  subCategory: string
  parentCategory: string
  totalReceipts: number
  totalExpenditure: number
  balance: number
}

type AllocationFilters = {
  allocationNumber?: string
  fy?: string
}

type FieldFormData = {
  category?: string
  [key: string]: string | number | Date | undefined
}

const TABS: { value: Tab; label: string }[] = [
  { value: "summary", label: "Summary" },
  { value: "allocations", label: "Allocations" },
  { value: "receipts", label: "Receipts" },
  { value: "expenditures", label: "Expenditure" },
  { value: "reports", label: "Reports" },
]

const SCALES: Scale[] = ["absolute", "thousands", "lakhs", "crores"]
const CATEGORY_COLORS = ["#337AB7", "#5CB85C", "#F0AD4E"]
const TANGENTIAL_GAP_PX = 5

const RICH_COLORS = CATEGORY_COLORS.map(color => ({
  solid: color,
}))

const categoryLegend = categories.map((cat, i) => ({
  name: cat,
  color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
}))

const chartConfig = { amount: { label: "Expenditure" } } satisfies ChartConfig

const randomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const randomDate = (year = 2024) =>
  new Date(year, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
const randomAmount = (max: number) => parseFloat((Math.random() * max).toFixed(2))

const generateReceipts = (count: number): Receipt[] =>
  Array.from({ length: count }, () => ({
    date: randomDate(),
    sanctionOrder:
      Math.random() > 0.5
        ? `${1000 + Math.floor(Math.random() * 9000)}`
        : `SO-${1000 + Math.floor(Math.random() * 9000)}`,
    category: randomItem(categories),
    amount: randomAmount(100000),
    attachment: Math.random() > 0.5 ? "https://example.com/file.pdf" : undefined,
  }))

const generateAllocations = (count: number): Allocation[] =>
  Array.from({ length: count }, () => ({
    date: randomDate(),
    allocationNumber: `AL-${1000 + Math.floor(Math.random() * 900)}`,
    categoryAmounts: categories.map(category => ({
      category,
      allocatedAmount: randomAmount(100000),
    })),
  }))

const generateExpenditures = (count: number): Expenditure[] =>
  Array.from({ length: count }, () => {
    const category = randomItem(categories)
    return {
      date: randomDate(),
      billNo:
        Math.random() > 0.5
          ? `${1000 + Math.floor(Math.random() * 9000)}`
          : `BN-${1000 + Math.floor(Math.random() * 9000)}`,
      voucherNo:
        Math.random() > 0.5
          ? `${1000 + Math.floor(Math.random() * 9000)}`
          : `VN-${1000 + Math.floor(Math.random() * 9000)}`,
      category,
      subCategory: randomItem(subCategoriesMap[category]),
      department:
        category === "OH-35 Grants for Creation of Capital Assets"
          ? randomItem(departments.slice(1))
          : "-",
      amount: randomAmount(50000),
      attachment: Math.random() > 0.5 ? "https://example.com/file.pdf" : undefined,
    }
  })

const exportToExcel = (data: Record<string, string | number>[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data")
  XLSX.writeFile(workbook, `${fileName}.xlsx`)
}

const getFY = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

const formatDateDisplay = (date: Date) =>
  date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

const formatDateExport = (date: Date) => date.toLocaleDateString("en-IN")

const allocationToFlat = (a: Allocation & { _index: number }): AllocationFlat => ({
  _index: a._index,
  date: a.date,
  allocationNumber: a.allocationNumber,
  ...Object.fromEntries(a.categoryAmounts.map(ca => [`amount_${ca.category}`, ca.allocatedAmount])),
})

const flatToAllocation = (flat: AllocationFlat): Allocation => ({
  date: flat.date as Date,
  allocationNumber: flat.allocationNumber as string,
  categoryAmounts: categories.map(c => ({
    category: c,
    allocatedAmount: Number(flat[`amount_${c}`]) || 0,
  })),
})

const resolveColorToRgba = (color: string, alpha: number): string => {
  const ctx = document.createElement("canvas").getContext("2d")
  if (!ctx) return color
  ctx.fillStyle = color
  const hex = ctx.fillStyle.replace("#", "")
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function FilterCard({
  title,
  onClear,
  children,
}: {
  title?: string
  onClear: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden mb-6">
      <div className="px-6 py-4 border-b bg-muted/40 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title ?? "Filters"}</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-muted-foreground hover:text-foreground text-xs gap-1.5"
        >
          <X className="h-3.5 w-3.5" />
          Clear All
        </Button>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  )
}

function FilterRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${React.Children.count(children)}, minmax(0, 1fr))` }}>
      {children}
    </div>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  )
}

export function Dashboard() {
  const [scale, setScale] = useState<Scale>("absolute")
  const [activeTab, setActiveTab] = useState<Tab>("summary")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const [receipts, setReceipts] = useState<Receipt[]>(generateReceipts(100))
  const [allocations, setAllocations] = useState<Allocation[]>(generateAllocations(21))
  const [expenditures, setExpenditures] = useState<Expenditure[]>(generateExpenditures(150))

  const [allocationFilters, setAllocationFilters] = useState<AllocationFilters>({})
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set())

  const [receiptTabFilters, setReceiptTabFilters] = useState({
    sanctionOrder: "",
    category: "",
    amountMin: "",
    amountMax: "",
    dateFrom: "",
    dateTo: "",
  })

  const [expenditureTabFilters, setExpenditureTabFilters] = useState({
    billNo: "",
    voucherNo: "",
    category: "",
    subCategory: "",
    expenditureMin: "",
    expenditureMax: "",
    dateFrom: "",
    dateTo: "",
  })

  const [reportType, setReportType] = useState<"expenditure" | "receipts" | null>(null)
  const [filterType, setFilterType] = useState<"dateRange" | "financialYear" | null>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedFinancialYear, setSelectedFinancialYear] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedSubCategory, setSelectedSubCategory] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [selectedReceiptCategory, setSelectedReceiptCategory] = useState("")

  const chartWrapperRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  const pieWrapperRef = useRef<HTMLDivElement>(null)
  const [pieContainerWidth, setPieContainerWidth] = useState(0)

  useEffect(() => {
    const el = chartWrapperRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    setContainerWidth(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (activeTab !== "summary") return
    const el = pieWrapperRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) setPieContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    if (el.clientWidth > 0) setPieContainerWidth(el.clientWidth)
    return () => observer.disconnect()
  }, [activeTab])

  const pieSize = Math.max(180, pieContainerWidth)
  const pieR = pieSize / 2
  const innerInnerR = Math.round(pieR * 0.338)
  const innerOuterR = Math.round(pieR * 0.592)
  const outerInnerR = Math.round(pieR * 0.620)
  const outerOuterR = Math.round(pieR * 0.901)
  const outerMidR = (outerInnerR + outerOuterR) / 2
  const outerPaddingAngle = (TANGENTIAL_GAP_PX / outerMidR) * (180 / Math.PI)

  const canModify = true

  const formatINR = useCallback((value: number): string => {
    let displayValue = value
    let suffix = ""
    if (scale === "thousands") { displayValue = value / 1000; suffix = " K" }
    else if (scale === "lakhs") { displayValue = value / 100000; suffix = " L" }
    else if (scale === "crores") { displayValue = value / 10000000; suffix = " Cr" }
    const absVal = Math.abs(displayValue)
    return `${value < 0 ? "- " : ""}₹${absVal.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}${suffix}`
  }, [scale])

  const toggleRow = (category: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(category) ? next.delete(category) : next.add(category)
      return next
    })
  }

  const toggleHistoryRow = (allocationNumber: string) => {
    setExpandedHistory(prev => {
      const next = new Set(prev)
      next.has(allocationNumber) ? next.delete(allocationNumber) : next.add(allocationNumber)
      return next
    })
  }

  const handleAllocationAdd = (formData: AllocationFlat) =>
    setAllocations(prev => [flatToAllocation(formData), ...prev])

  const handleAllocationSave = (i: number) => (formData: AllocationFlat) =>
    setAllocations(prev => { const n = [...prev]; n[i] = flatToAllocation(formData); return n })

  const handleAllocationDelete = (i: number) => () =>
    setAllocations(prev => prev.filter((_, idx) => idx !== i))

  const handleReceiptAdd = (r: Receipt) => setReceipts(prev => [r, ...prev])
  const handleReceiptSave = (i: number) => (r: Receipt) =>
    setReceipts(prev => { const n = [...prev]; n[i] = r; return n })
  const handleReceiptDelete = (i: number) => () =>
    setReceipts(prev => prev.filter((_, idx) => idx !== i))

  const handleExpenditureAdd = (e: Expenditure) => setExpenditures(prev => [e, ...prev])
  const handleExpenditureSave = (i: number) => (e: Expenditure) =>
    setExpenditures(prev => { const n = [...prev]; n[i] = e; return n })
  const handleExpenditureDelete = (i: number) => () =>
    setExpenditures(prev => prev.filter((_, idx) => idx !== i))

  const receiptFields = [
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "sanctionOrder", label: "Sanction Order", type: "text" as const, required: true },
    { key: "category", label: "OH Category", type: "select" as const, options: categories, required: true },
    { key: "amount", label: "Amount", type: "number" as const, required: true },
    { key: "attachment", label: "Attachment URL", type: "text" as const, required: false },
  ]

  const allocationFields = useMemo(() => [
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "allocationNumber", label: "Allocation Number", type: "text" as const, required: true },
    ...categories.map(c => ({
      key: `amount_${c}`,
      label: c,
      type: "number" as const,
      required: true,
    })),
  ], [])

  const expenditureFields = [
    { key: "date", label: "Date", type: "date" as const, required: true },
    { key: "billNo", label: "Bill No.", type: "text" as const, required: true },
    { key: "voucherNo", label: "Voucher No.", type: "text" as const, required: true },
    { key: "category", label: "OH Category", type: "select" as const, options: categories, required: true },
    {
      key: "subCategory",
      label: "OH Sub-Category",
      type: "select" as const,
      required: true,
      dependsOn: "category",
      getDynamicOptions: (formData: FieldFormData) => formData.category ? subCategoriesMap[formData.category] : [],
    },
    { key: "department", label: "Department", type: "select" as const, options: ["-", ...departments.slice(1)], required: true },
    { key: "amount", label: "Amount", type: "number" as const, required: true },
    { key: "attachment", label: "Attachment URL", type: "text" as const, required: false },
  ]

  const dateFormatDisplay = (key: string, value: FieldValue): string => {
    if (key === "date" && value instanceof Date) return value.toISOString().split("T")[0]
    return String(value ?? "")
  }

  const attachmentCell = (url: string | number | Date | undefined) =>
    url ? (
      <a href={String(url)} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
        View
      </a>
    ) : <>-</>

  const receiptColumns: Column<Receipt & { _index: number }>[] = [
    { key: "date", label: "Date", sortable: true, format: d => d instanceof Date ? formatDateDisplay(d) : String(d) },
    { key: "sanctionOrder", label: "Sanction Order", sortable: true },
    { key: "category", label: "OH Category", sortable: true },
    { key: "amount", label: "Amount", sortable: true, className: "text-right", format: a => typeof a === "number" ? formatINR(a) : "-" },
    { key: "attachment", label: "Attachment", format: attachmentCell },
    {
      key: "_index",
      label: "Actions",
      format: (_val, row) =>
        canModify ? (
          <EditDeleteDialog
            row={row}
            fields={receiptFields}
            onSave={handleReceiptSave(row._index)}
            onDelete={handleReceiptDelete(row._index)}
            formatDisplay={dateFormatDisplay}
          />
        ) : <>-</>,
    },
  ]

  const allocationDisplayColumns: Column<AllocationCategoryAmount>[] = [
    { key: "category", label: "OH Category", sortable: true },
    {
      key: "allocatedAmount",
      label: "Allocated Amount",
      sortable: true,
      className: "text-right",
      format: v => typeof v === "number" ? formatINR(v) : "-",
    },
  ]

  const expenditureColumns: Column<Expenditure & { _index: number }>[] = [
    { key: "date", label: "Date", sortable: true, format: d => d instanceof Date ? formatDateDisplay(d) : String(d) },
    { key: "billNo", label: "Bill No.", sortable: true },
    { key: "voucherNo", label: "Voucher No.", sortable: true },
    { key: "category", label: "OH Category", sortable: true },
    { key: "subCategory", label: "OH Sub-Category", sortable: true },
    { key: "department", label: "Department", sortable: true },
    { key: "amount", label: "Amount", sortable: true, className: "text-right", format: a => typeof a === "number" ? formatINR(a) : "-" },
    { key: "attachment", label: "Attachment", format: attachmentCell },
    {
      key: "_index",
      label: "Actions",
      format: (_val, row) =>
        canModify ? (
          <EditDeleteDialog
            row={row}
            fields={expenditureFields}
            onSave={handleExpenditureSave(row._index)}
            onDelete={handleExpenditureDelete(row._index)}
            formatDisplay={dateFormatDisplay}
          />
        ) : <>-</>,
    },
  ]

  const filteredReceiptTabData = useMemo(() => {
    return receipts.filter(r => {
      if (receiptTabFilters.sanctionOrder && !r.sanctionOrder.toLowerCase().includes(receiptTabFilters.sanctionOrder.toLowerCase())) return false
      if (receiptTabFilters.category && r.category !== receiptTabFilters.category) return false
      if (receiptTabFilters.amountMin && r.amount < Number(receiptTabFilters.amountMin)) return false
      if (receiptTabFilters.amountMax && r.amount > Number(receiptTabFilters.amountMax)) return false
      if (receiptTabFilters.dateFrom && r.date < new Date(receiptTabFilters.dateFrom)) return false
      if (receiptTabFilters.dateTo) {
        const end = new Date(receiptTabFilters.dateTo); end.setHours(23, 59, 59, 999)
        if (r.date > end) return false
      }
      return true
    })
  }, [receipts, receiptTabFilters])

  const filteredExpenditureTabData = useMemo(() => {
    return expenditures.filter(e => {
      if (expenditureTabFilters.billNo && !e.billNo.toLowerCase().includes(expenditureTabFilters.billNo.toLowerCase())) return false
      if (expenditureTabFilters.voucherNo && !e.voucherNo.toLowerCase().includes(expenditureTabFilters.voucherNo.toLowerCase())) return false
      if (expenditureTabFilters.category && e.category !== expenditureTabFilters.category) return false
      if (expenditureTabFilters.subCategory && e.subCategory !== expenditureTabFilters.subCategory) return false
      if (expenditureTabFilters.expenditureMin && e.amount < Number(expenditureTabFilters.expenditureMin)) return false
      if (expenditureTabFilters.expenditureMax && e.amount > Number(expenditureTabFilters.expenditureMax)) return false
      if (expenditureTabFilters.dateFrom && e.date < new Date(expenditureTabFilters.dateFrom)) return false
      if (expenditureTabFilters.dateTo) {
        const end = new Date(expenditureTabFilters.dateTo); end.setHours(23, 59, 59, 999)
        if (e.date > end) return false
      }
      return true
    })
  }, [expenditures, expenditureTabFilters])

  const summaryCategoryData = useMemo(() =>
    categories.map(category => {
      const totalReceipts = receipts.filter(r => r.category === category).reduce((s, r) => s + r.amount, 0)
      const totalExpenditure = expenditures.filter(e => e.category === category).reduce((s, e) => s + e.amount, 0)
      const subCategories: SubCategorySummary[] = (subCategoriesMap[category] ?? []).map(sub => {
        const subExpenditure = expenditures
          .filter(e => e.category === category && e.subCategory === sub)
          .reduce((s, e) => s + e.amount, 0)
        return { subCategory: sub, parentCategory: category, totalReceipts: 0, totalExpenditure: subExpenditure, balance: -subExpenditure }
      })
      return { category, totalReceipts, totalExpenditure, balance: totalReceipts - totalExpenditure, subCategories }
    }),
    [receipts, expenditures])

  const grandTotals = useMemo(() =>
    summaryCategoryData.reduce(
      (acc, row) => ({
        totalReceipts: acc.totalReceipts + row.totalReceipts,
        totalExpenditure: acc.totalExpenditure + row.totalExpenditure,
        balance: acc.balance + row.balance,
      }),
      { totalReceipts: 0, totalExpenditure: 0, balance: 0 }
    ),
    [summaryCategoryData])

  const grandPct = grandTotals.totalReceipts > 0
    ? Math.min((grandTotals.totalExpenditure / grandTotals.totalReceipts) * 100, 100)
    : 0

  const chartData = useMemo(() => {
    if (expandedRows.size === 0) return summaryCategoryData.flatMap(c => c.subCategories)
    return summaryCategoryData.filter(c => expandedRows.has(c.category)).flatMap(c => c.subCategories)
  }, [summaryCategoryData, expandedRows])

  const maxExpenditureValue = useMemo(() => {
    return Math.max(...chartData.map(d => d.totalExpenditure), 0)
  }, [chartData])
  const dynamicChartHeight = useMemo(() => {
    const labelText = formatINR(maxExpenditureValue)
    const rotatedLabelHeight = labelText.length * 24 + 24
    return rotatedLabelHeight + 120
  }, [maxExpenditureValue, formatINR])

  const dynamicBarSize = useMemo(() => {
    if (!containerWidth || chartData.length === 0) return 48
    const MIN_GAP = 2
    const MAX_GAP = 8
    const TARGET_BAR = 32
    const slotWidth = containerWidth / chartData.length

    const minBarWidth = Math.max(2, slotWidth - MAX_GAP)
    const maxBarWidth = Math.max(2, slotWidth - MIN_GAP)
    const barWidth = Math.max(minBarWidth, Math.min(maxBarWidth, TARGET_BAR))
    return barWidth
  }, [containerWidth, chartData.length])

  const financialYears = useMemo(() => {
    const dates = [...receipts.map(r => r.date), ...expenditures.map(e => e.date), ...allocations.map(a => a.date)]
    return Array.from(new Set(dates.map(getFY))).sort().reverse()
  }, [receipts, expenditures, allocations])

  const allocationsWithIndex = useMemo(
    () => allocations.map((a, i) => ({ ...a, _index: i })),
    [allocations]
  )

  const filteredAllocations = useMemo(() =>
    allocationsWithIndex.filter(a => {
      if (allocationFilters.allocationNumber && !a.allocationNumber.toLowerCase().includes(allocationFilters.allocationNumber.toLowerCase())) return false
      if (allocationFilters.fy && getFY(a.date) !== allocationFilters.fy) return false
      return true
    }),
    [allocationsWithIndex, allocationFilters])

  const allocationTables = useMemo(() => {
    const map: Record<string, (Allocation & { _index: number })[]> = {}
    filteredAllocations.forEach(a => {
      if (!map[a.allocationNumber]) map[a.allocationNumber] = []
      map[a.allocationNumber].push(a)
    })
    return Object.entries(map)
      .map(([allocNo, entries]) => {
        const sorted = [...entries].sort((a, b) => b.date.getTime() - a.date.getTime())
        const latest = sorted[0]
        return {
          allocationNumber: allocNo,
          date: latest.date,
          entry: latest,
          rows: latest.categoryAmounts,
          total: latest.categoryAmounts.reduce((s, r) => s + r.allocatedAmount, 0),
        }
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [filteredAllocations])

  const latestAllocationTable = allocationTables[0] ?? null
  const historyAllocationTables = allocationTables.slice(1)

  const receiptsWithIndex = filteredReceiptTabData.map((r) => ({
    ...r,
    _index: receipts.indexOf(r),
  }))

  const expendituresWithIndex = filteredExpenditureTabData.map(e => ({
    ...e,
    _index: expenditures.indexOf(e),
  }))

  const resetReportFilters = () => {
    setFilterType(null)
    setStartDate("")
    setEndDate("")
    setSelectedFinancialYear("")
    setSelectedCategory("")
    setSelectedSubCategory("")
    setSelectedDepartment("")
    setSelectedReceiptCategory("")
  }

  const filteredReportData = useMemo(() => {
    if (!reportType) return []

    let data: (Receipt | Expenditure)[] = reportType === "expenditure" ? expenditures : receipts

    if (filterType === "dateRange") {
      if (startDate) data = data.filter(item => item.date >= new Date(startDate))
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        data = data.filter(item => item.date <= end)
      }
    } else if (filterType === "financialYear" && selectedFinancialYear) {
      data = data.filter(item => getFY(item.date) === selectedFinancialYear)
    }

    if (reportType === "expenditure") {
      if (selectedCategory) data = (data as Expenditure[]).filter(e => e.category === selectedCategory)
      if (selectedSubCategory) data = (data as Expenditure[]).filter(e => e.subCategory === selectedSubCategory)
      if (selectedDepartment) data = (data as Expenditure[]).filter(e => e.department === selectedDepartment)
    }

    if (reportType === "receipts") {
      if (selectedReceiptCategory) data = (data as Receipt[]).filter(r => r.category === selectedReceiptCategory)
    }

    return data
  }, [
    reportType, filterType,
    startDate, endDate,
    selectedFinancialYear,
    selectedCategory, selectedSubCategory, selectedDepartment,
    selectedReceiptCategory,
    expenditures, receipts,
  ])

  const reportExportData = useMemo(() => {
    if (reportType === "expenditure") {
      return (filteredReportData as Expenditure[]).map(e => ({
        Date: formatDateExport(e.date),
        "Bill No.": e.billNo,
        "Voucher No.": e.voucherNo,
        "OH Category": e.category,
        "OH Sub-Category": e.subCategory,
        Department: e.department,
        Amount: e.amount,
        Attachment: e.attachment ?? "",
      }))
    }
    return (filteredReportData as Receipt[]).map(r => ({
      Date: formatDateExport(r.date),
      "Sanction Order": r.sanctionOrder,
      "OH Category": r.category,
      Amount: r.amount,
      Attachment: r.attachment ?? "",
    }))
  }, [filteredReportData, reportType])

  const pieCategoryData = useMemo(() =>
    expandedRows.size === 0
      ? summaryCategoryData
      : summaryCategoryData.filter(c => expandedRows.has(c.category)),
    [summaryCategoryData, expandedRows])

  const innerPieData = useMemo(() =>
    pieCategoryData.map((row) => {
      const idx = categories.indexOf(row.category)
      return {
        name: row.category,
        value: row.totalReceipts,
        fill: RICH_COLORS[idx % RICH_COLORS.length].solid,
      }
    }),
    [pieCategoryData])

  const outerPieData = useMemo(() =>
    pieCategoryData.flatMap((row) => {
      const idx = categories.indexOf(row.category)
      const { solid } = RICH_COLORS[idx % RICH_COLORS.length]
      const balanceFill = resolveColorToRgba(solid, 0.28)

      const totalReceipts = Math.max(0, row.totalReceipts)

      if (expandedRows.size === 0) {
        const expVal = Math.min(Math.max(0, row.totalExpenditure), totalReceipts || row.totalExpenditure)
        const balVal = Math.max(0, totalReceipts - expVal)
        return [
          { name: row.category, label: "Expenditure", value: expVal, fill: solid, category: row.category },
          { name: row.category, label: "Balance", value: balVal, fill: balanceFill, category: row.category },
        ]
      }

      const subSegments = row.subCategories
        .filter(sub => sub.totalExpenditure > 0)
        .map(sub => ({
          name: sub.subCategory,
          label: "Expenditure",
          value: sub.totalExpenditure,
          fill: solid,
          category: row.category,
        }))

      const totalExpenditure = Math.min(Math.max(0, row.totalExpenditure), totalReceipts || row.totalExpenditure)
      const balance = Math.max(0, totalReceipts - totalExpenditure)

      if (balance > 0) {
        subSegments.push({
          name: `${row.category} (Balance)`,
          label: "Balance",
          value: balance,
          fill: balanceFill,
          category: row.category,
        })
      }

      return subSegments
    }),
    [pieCategoryData, expandedRows])

  const renderAllocationCard = (
    table: typeof allocationTables[number],
    isLatest: boolean
  ) => (
    <div key={table.allocationNumber} className={`mb-4 border rounded-lg px-4 pt-4 ${isLatest ? "border-primary/40 bg-primary/5" : "bg-muted/20"}`}>
      <div className="flex justify-between items-center ms-2 mb-2">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-lg">{table.allocationNumber}</h3>
          {isLatest && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
              Latest
            </span>
          )}
          <span className="text-xs text-muted-foreground">{formatDateDisplay(table.date)}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-semibold">Total: {formatINR(table.total)}</span>
          {canModify && (
            <EditDeleteDialog
              row={allocationToFlat(table.entry)}
              fields={allocationFields}
              onSave={formData => handleAllocationSave(table.entry._index)(formData as AllocationFlat)}
              onDelete={handleAllocationDelete(table.entry._index)}
              formatDisplay={dateFormatDisplay}
            />
          )}
        </div>
      </div>
      <DataTable
        data={table.rows}
        columns={allocationDisplayColumns}
        performPagination={false}
        showResultCount={false}
      />
    </div>
  )

  return (
    <>
      <div className="flex-1 flex flex-col items-center pb-8">
        <div className="text-4xl font-extrabold text-center mb-2">
          Dr B R Ambedkar National Institute of Technology Jalandhar
        </div>
        <h1 className="text-2xl font-bold text-center">Ministry Grants Receipts & Expenditure</h1>
      </div>

      <div className="flex flex-col lg:flex-row items-center lg:justify-between lg:items-end gap-2 mb-6">
        <div className="flex flex-row gap-2">
          {TABS.map(tab => (
            <Button
              key={tab.value}
              variant={activeTab === tab.value ? "default" : "outline"}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="w-full mt-6 flex flex-col items-center lg:items-end">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Currency Scale
          </span>
          <div className="inline-flex px-1 py-1 bg-muted rounded-lg border">
            {SCALES.map(s => (
              <button
                key={s}
                onClick={() => setScale(s)}
                className={cn(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-all capitalize",
                  scale === s ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "allocations" && (
        <>
          <FilterCard
            title="Allocation Filters"
            onClear={() => setAllocationFilters({})}
          >
            <FilterRow>
              <FilterField label="Allocation No.">
                <Input
                  placeholder="Search allocation number"
                  value={allocationFilters.allocationNumber ?? ""}
                  onChange={e => setAllocationFilters(p => ({ ...p, allocationNumber: e.target.value }))}
                />
              </FilterField>
              <FilterField label="Financial Year">
                <Select
                  value={allocationFilters.fy || "all"}
                  onValueChange={v => setAllocationFilters(p => ({ ...p, fy: v === "all" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {Array.from(new Set(allocations.map(a => getFY(a.date))))
                      .sort((a, b) => b.localeCompare(a))
                      .map(fy => (
                        <SelectItem key={fy} value={fy}>{fy}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </FilterField>
            </FilterRow>
          </FilterCard>

          {canModify && (
            <div className="flex justify-end mb-4">
              <AddEntryDialog
                fields={allocationFields}
                onAdd={formData => handleAllocationAdd(formData as AllocationFlat)}
                title="Add Allocation"
                buttonLabel="Add Allocation"
              />
            </div>
          )}

          {allocationTables.length === 0 && (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
              <p className="font-medium">No allocations found matching the selected filters</p>
              <p className="text-sm mt-1">Try adjusting or clearing some filters</p>
            </div>
          )}

          {latestAllocationTable && renderAllocationCard(latestAllocationTable, true)}

          {historyAllocationTables.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setExpandedHistory(prev => {
                  const allExpanded = historyAllocationTables.every(t => prev.has(t.allocationNumber))
                  if (allExpanded) return new Set()
                  return new Set(historyAllocationTables.map(t => t.allocationNumber))
                })}
                className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {historyAllocationTables.every(t => expandedHistory.has(t.allocationNumber))
                  ? <ChevronDown className="h-4 w-4" />
                  : <ChevronRight className="h-4 w-4" />}
                History ({historyAllocationTables.length} allocation{historyAllocationTables.length !== 1 ? "s" : ""})
              </button>

              <div className="space-y-2">
                {historyAllocationTables.map(table => (
                  <div key={table.allocationNumber} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleHistoryRow(table.allocationNumber)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {expandedHistory.has(table.allocationNumber)
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-medium">{table.allocationNumber}</span>
                        <span className="text-xs text-muted-foreground">{formatDateDisplay(table.date)}</span>
                      </div>
                      <span className="text-sm font-medium">{formatINR(table.total)}</span>
                    </button>

                    {expandedHistory.has(table.allocationNumber) && (
                      <div className="border-t px-4 pt-2 pb-4 bg-muted/10">
                        <div className="flex justify-end mb-2">
                          {canModify && (
                            <EditDeleteDialog
                              row={allocationToFlat(table.entry)}
                              fields={allocationFields}
                              onSave={formData => handleAllocationSave(table.entry._index)(formData as AllocationFlat)}
                              onDelete={handleAllocationDelete(table.entry._index)}
                              formatDisplay={dateFormatDisplay}
                            />
                          )}
                        </div>
                        <DataTable
                          data={table.rows}
                          columns={allocationDisplayColumns}
                          performPagination={false}
                          showResultCount={false}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "receipts" && (
        <>
          <FilterCard
            title="Receipt Filters"
            onClear={() => setReceiptTabFilters({
              sanctionOrder: "", category: "", amountMin: "", amountMax: "", dateFrom: "", dateTo: "",
            })}
          >
            <FilterRow>
              <FilterField label="Sanction Order">
                <Input
                  placeholder="Search sanction order"
                  value={receiptTabFilters.sanctionOrder}
                  onChange={e => setReceiptTabFilters(p => ({ ...p, sanctionOrder: e.target.value }))}
                />
              </FilterField>
              <FilterField label="OH Category">
                <Select
                  value={receiptTabFilters.category || "all"}
                  onValueChange={v => setReceiptTabFilters(p => ({ ...p, category: v === "all" ? "" : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>
            </FilterRow>

            <FilterRow>
              <FilterField label="Min Amount">
                <Input
                  type="number"
                  placeholder="Min ₹"
                  value={receiptTabFilters.amountMin}
                  onChange={e => setReceiptTabFilters(p => ({ ...p, amountMin: e.target.value }))}
                />
              </FilterField>
              <FilterField label="Max Amount">
                <Input
                  type="number"
                  placeholder="Max ₹"
                  value={receiptTabFilters.amountMax}
                  onChange={e => setReceiptTabFilters(p => ({ ...p, amountMax: e.target.value }))}
                />
              </FilterField>
              <FilterField label="From Date">
                <Input
                  type="date"
                  value={receiptTabFilters.dateFrom}
                  max={receiptTabFilters.dateTo || undefined}
                  onChange={e => setReceiptTabFilters(p => ({ ...p, dateFrom: e.target.value }))}
                />
              </FilterField>
              <FilterField label="To Date">
                <Input
                  type="date"
                  value={receiptTabFilters.dateTo}
                  min={receiptTabFilters.dateFrom || undefined}
                  onChange={e => setReceiptTabFilters(p => ({ ...p, dateTo: e.target.value }))}
                />
              </FilterField>
            </FilterRow>
          </FilterCard>

          {canModify && (
            <div className="flex justify-end mb-4">
              <AddEntryDialog fields={receiptFields} onAdd={handleReceiptAdd} title="Add Receipt" buttonLabel="Add Receipt" />
            </div>
          )}

          {receiptsWithIndex.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
              <p className="font-medium">No receipts match the selected filters</p>
              <p className="text-sm mt-1">Try adjusting or clearing some filters</p>
            </div>
          ) : (
            <DataTable data={receiptsWithIndex} columns={receiptColumns} filters={[]} defaultSort="date" />
          )}
        </>
      )}

      {activeTab === "expenditures" && (
        <>
          <FilterCard
            title="Expenditure Filters"
            onClear={() => setExpenditureTabFilters({
              billNo: "", voucherNo: "", category: "", subCategory: "",
              expenditureMin: "", expenditureMax: "", dateFrom: "", dateTo: "",
            })}
          >
            <FilterRow>
              <FilterField label="Bill No.">
                <Input
                  placeholder="Search bill number"
                  value={expenditureTabFilters.billNo}
                  onChange={e => setExpenditureTabFilters(p => ({ ...p, billNo: e.target.value }))}
                />
              </FilterField>
              <FilterField label="Voucher No.">
                <Input
                  placeholder="Search voucher number"
                  value={expenditureTabFilters.voucherNo}
                  onChange={e => setExpenditureTabFilters(p => ({ ...p, voucherNo: e.target.value }))}
                />
              </FilterField>
            </FilterRow>

            <FilterRow>
              <FilterField label="OH Category">
                <Select
                  value={expenditureTabFilters.category || "all"}
                  onValueChange={v => setExpenditureTabFilters(p => ({
                    ...p,
                    category: v === "all" ? "" : v,
                    subCategory: "",
                  }))}
                >
                  <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FilterField>
              <FilterField label="OH Sub-Category">
                <Select
                  value={expenditureTabFilters.subCategory || "all"}
                  onValueChange={v => setExpenditureTabFilters(p => ({ ...p, subCategory: v === "all" ? "" : v }))}
                  disabled={!expenditureTabFilters.category}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={expenditureTabFilters.category ? "All sub-categories" : "Select category first"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {(expenditureTabFilters.category ? subCategoriesMap[expenditureTabFilters.category] : []).map(sc => (
                      <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterField>
            </FilterRow>

            <FilterRow>
              <FilterField label="Min Amount">
                <Input
                  type="number"
                  placeholder="Min ₹"
                  value={expenditureTabFilters.expenditureMin}
                  onChange={e => setExpenditureTabFilters(p => ({ ...p, expenditureMin: e.target.value }))}
                />
              </FilterField>
              <FilterField label="Max Amount">
                <Input
                  type="number"
                  placeholder="Max ₹"
                  value={expenditureTabFilters.expenditureMax}
                  onChange={e => setExpenditureTabFilters(p => ({ ...p, expenditureMax: e.target.value }))}
                />
              </FilterField>
              <FilterField label="From Date">
                <Input
                  type="date"
                  value={expenditureTabFilters.dateFrom}
                  max={expenditureTabFilters.dateTo || undefined}
                  onChange={e => setExpenditureTabFilters(p => ({ ...p, dateFrom: e.target.value }))}
                />
              </FilterField>
              <FilterField label="To Date">
                <Input
                  type="date"
                  value={expenditureTabFilters.dateTo}
                  min={expenditureTabFilters.dateFrom || undefined}
                  onChange={e => setExpenditureTabFilters(p => ({ ...p, dateTo: e.target.value }))}
                />
              </FilterField>
            </FilterRow>
          </FilterCard>

          {canModify && (
            <div className="flex justify-end mb-4">
              <AddEntryDialog fields={expenditureFields} onAdd={handleExpenditureAdd} title="Add Expenditure" buttonLabel="Add Expenditure" />
            </div>
          )}

          {expendituresWithIndex.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
              <p className="font-medium">No expenditures match the selected filters</p>
              <p className="text-sm mt-1">Try adjusting or clearing some filters</p>
            </div>
          ) : (
            <DataTable
              data={expendituresWithIndex}
              columns={expenditureColumns}
              filters={[]}
              defaultSort="date"
            />
          )}
        </>
      )}

      {activeTab === "reports" && (
        <div className="space-y-6">
          <FilterCard
            title="Report Filters"
            onClear={() => { setReportType(null); resetReportFilters() }}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Report Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["receipts", "expenditure"] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => { setReportType(type); resetReportFilters() }}
                        className={cn(
                          "px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
                          reportType === type
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background hover:bg-muted border-input text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {type === "expenditure" ? "Expenditure" : "Receipts"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Date Filter</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: null, label: "All Time" },
                      { value: "dateRange", label: "Date Range" },
                      { value: "financialYear", label: "Financial Year" },
                    ] as const).map(ft => (
                      <button
                        key={String(ft.value)}
                        onClick={() => {
                          setFilterType(ft.value)
                          setStartDate("")
                          setEndDate("")
                          setSelectedFinancialYear("")
                        }}
                        className={cn(
                          "px-3 py-2.5 rounded-lg border text-sm font-medium transition-all",
                          filterType === ft.value
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background hover:bg-muted border-input text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {ft.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filterType === "dateRange" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm">From Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      max={endDate || undefined}
                      onChange={e => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">To Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={e => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {filterType === "financialYear" && (
                <div className="max-w-xs space-y-1.5">
                  <Label className="text-sm">Financial Year</Label>
                  <Select
                    value={selectedFinancialYear || "all"}
                    onValueChange={v => setSelectedFinancialYear(v === "all" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Financial Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {financialYears.map(fy => (
                        <SelectItem key={fy} value={fy}>{fy}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {reportType === "expenditure" && (
                <div className="border-t pt-5 space-y-3">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Additional Filters
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">OH Category</Label>
                      <Select
                        value={selectedCategory || "all"}
                        onValueChange={v => {
                          setSelectedCategory(v === "all" ? "" : v)
                          setSelectedSubCategory("")
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm">OH Sub-Category</Label>
                      <Select
                        value={selectedSubCategory || "all"}
                        onValueChange={v => setSelectedSubCategory(v === "all" ? "" : v)}
                        disabled={!selectedCategory}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={selectedCategory ? "All" : "Select category first"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {(selectedCategory ? subCategoriesMap[selectedCategory] : []).map(sc => (
                            <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm">Department</Label>
                      <Select
                        value={selectedDepartment || "all"}
                        onValueChange={v => setSelectedDepartment(v === "all" ? "" : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {["-", ...departments.slice(1)].map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {reportType === "receipts" && (
                <div className="border-t pt-5 space-y-3">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Additional Filters
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm">OH Category</Label>
                      <Select
                        value={selectedReceiptCategory || "all"}
                        onValueChange={v => setSelectedReceiptCategory(v === "all" ? "" : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </FilterCard>

          {!reportType && (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
              <p className="font-medium">Select a report type above to get started</p>
              <p className="text-sm mt-1">Choose Expenditure or Receipts, then optionally apply filters</p>
            </div>
          )}

          {reportType && filteredReportData.length === 0 && (
            <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
              <p className="font-medium">No records match the selected filters</p>
              <p className="text-sm mt-1">Try adjusting or clearing some filters</p>
            </div>
          )}

          {reportType && filteredReportData.length > 0 && (() => {
            const totalAmount = filteredReportData.reduce((s, r) => s + r.amount, 0)
            const uniqueDates = new Set(filteredReportData.map(r => r.date.toDateString())).size
            const fourthStat = reportType === "expenditure"
              ? { label: "Unique Categories", value: new Set((filteredReportData as Expenditure[]).map(e => e.category)).size }
              : { label: "Unique Sanction Orders", value: new Set((filteredReportData as Receipt[]).map(r => r.sanctionOrder)).size }

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Total Records", value: filteredReportData.length.toLocaleString() },
                    { label: "Total Amount", value: formatINR(totalAmount) },
                    { label: "Unique Dates", value: uniqueDates.toLocaleString() },
                    fourthStat,
                  ].map(stat => (
                    <div key={stat.label} className="rounded-lg border bg-card px-4 py-3">
                      <div className="text-xs text-muted-foreground mb-0.5">{stat.label}</div>
                      <div className="text-lg font-semibold tabular-nums">{stat.value}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">
                    {reportType === "expenditure" ? "Expenditure" : "Receipts"} Report
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({filteredReportData.length} record{filteredReportData.length !== 1 ? "s" : ""})
                    </span>
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportToExcel(
                        reportExportData,
                        `${reportType === "expenditure" ? "Expenditure" : "Receipts"}_Report_${new Date().toISOString().split("T")[0]}`
                      )
                    }
                  >
                    Export
                  </Button>
                </div>

                {reportType === "expenditure" && (
                  <DataTable<Expenditure & { _index: number }>
                    data={(filteredReportData as Expenditure[]).map(e => {
                      const idx = expenditures.findIndex(
                        x => x.date.getTime() === e.date.getTime() && x.billNo === e.billNo && x.amount === e.amount
                      )
                      return { ...e, _index: idx >= 0 ? idx : 0 }
                    })}
                    columns={expenditureColumns}
                    filters={[]}
                    defaultSort="date"
                  />
                )}

                {reportType === "receipts" && (
                  <DataTable<Receipt & { _index: number }>
                    data={(filteredReportData as Receipt[]).map(r => {
                      const idx = receipts.findIndex(
                        x => x.date.getTime() === r.date.getTime() && x.sanctionOrder === r.sanctionOrder && x.amount === r.amount
                      )
                      return { ...r, _index: idx >= 0 ? idx : 0 }
                    })}
                    columns={receiptColumns}
                    filters={[]}
                    defaultSort="date"
                  />
                )}
              </div>
            )
          })()}
        </div>
      )}

      {activeTab === "summary" && (
        <div className="space-y-2">
          <div className="flex flex-col md:flex-row gap-2 items-stretch">

            <div className="flex-2 flex flex-col justify-between items-center px-4 py-4 rounded-lg border" ref={chartWrapperRef}>
              <h3 className="text-md font-semibold mb-2 text-muted-foreground self-start">Expenditure Breakdown</h3>
              <div className="mb-12">
                <ChartContainer
                  config={chartConfig}
                  style={{ height: dynamicChartHeight, width: "100%" }}
                >
                  <BarChart
                    data={chartData}
                    margin={{ top: 96, right: 0, left: 0, bottom: 16 }}
                    barCategoryGap="20%"
                    barSize={dynamicBarSize}
                  >
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          hideLabel={true}
                          formatter={(value, _, item) => (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold">{item.payload.parentCategory}</span>
                              <span className="text-xs font-semibold">{item.payload.subCategory}</span>
                              <span className="text-lg font-semibold text-primary">{formatINR(Number(value))}</span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Bar
                      dataKey="totalExpenditure"
                      radius={[0, 0, 0, 0]}
                      label={(props: LabelProps) => {
                        const x = Number(props.x ?? 0)
                        const y = Number(props.y ?? 0)
                        const width = Number(props.width ?? 0)
                        const value = Number(props.value ?? 0)
                        if (!value) return <></>
                        const cx = x + width / 2
                        return (
                          <text
                            x={cx}
                            y={y - 6}
                            textAnchor="start"
                            dominantBaseline="middle"
                            transform={`rotate(-90, ${cx}, ${y - 6})`}
                            style={{
                              fontSize: '11px',
                              fontVariantNumeric: 'tabular-nums',
                              letterSpacing: '0.01em',
                            }}
                          >
                            {formatINR(value)}
                          </text>
                        )
                      }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={RICH_COLORS[categories.indexOf(entry.parentCategory) % RICH_COLORS.length].solid}
                        />
                      ))}
                    </Bar>
                    <XAxis
                      dataKey="subCategory"
                      tick={(props: { x: string | number; y: string | number; payload?: { value: string } }) => {
                        const x = Number(props.x ?? 0)
                        const y = Number(props.y ?? 0)
                        const payload = props.payload
                        return (
                          <text
                            x={x}
                            y={y + 4}
                            textAnchor="end"
                            transform={`rotate(-90, ${x}, ${y + 4})`}
                            style={{ fontSize: 11, fontWeight: 700 }}
                          >
                            {(payload?.value ?? "").slice(0, 5)}
                          </text>
                        )
                      }}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                    />
                  </BarChart>
                </ChartContainer>

                <div className="flex flex-wrap justify-center gap-x-2 gap-y-2 mt-8 border-t pt-2">
                  {categoryLegend.map((item, i) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-2 text-xs font-medium px-2 py-1"
                    >
                      <span
                        className="w-4 h-4 rounded-lg shrink-0"
                        style={{ backgroundColor: RICH_COLORS[i % RICH_COLORS.length].solid }}
                      />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center px-4 py-4 rounded-lg border shrink-0">
              <h3 className="text-md font-semibold mb-4 text-muted-foreground self-start">Receipts vs Expenditure</h3>

              <div className="relative flex flex-col items-center justify-center w-full" ref={pieWrapperRef}>
                <PieChart width={pieSize} height={pieSize}>
                  <Pie
                    data={innerPieData}
                    cx={pieR - 1}
                    cy={pieR - 1}
                    innerRadius={innerInnerR}
                    outerRadius={innerOuterR}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={true}
                  >
                    {innerPieData.map((entry, index) => (
                      <Cell
                        key={`inner-${index}`}
                        fill={entry.fill}
                      />
                    ))}
                  </Pie>

                  <Pie
                    data={outerPieData}
                    cx={pieR - 1}
                    cy={pieR - 1}
                    innerRadius={outerInnerR}
                    outerRadius={outerOuterR}
                    dataKey="value"
                    stroke="none"
                    paddingAngle={outerPaddingAngle}
                    isAnimationActive={true}
                  >
                    {outerPieData.map((entry, index) => (
                      <Cell
                        key={`outer-${index}`}
                        fill={entry.fill}
                      />
                    ))}
                  </Pie>

                  <RechartsTooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload as typeof outerPieData[number] & typeof innerPieData[number]
                      return (
                        <div className="rounded-lg bg-background border shadow-sm px-3 py-2 text-xs space-y-1">
                          <p className="font-semibold text-foreground leading-tight" style={{ maxWidth: 180 }}>{d.name}</p>
                          {d.label ? (
                            <p className="text-muted-foreground">{d.label}</p>
                          ) : <p className="text-muted-foreground">Receipts</p>}
                          <p className="font-bold text-primary text-sm">{formatINR(d.value)}</p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </div>

              <div className="mt-4 w-full space-y-1">
                <div className="w-full flex flex-row justify-between text-xs text-muted-foreground border-b pb-2 px-2">
                  <span>Category</span>
                  <span>Balance</span>
                </div>
                <div className="pt-1 space-y-1">
                  {pieCategoryData.map((row) => {
                    const idx = categories.indexOf(row.category)
                    const color = RICH_COLORS[idx % RICH_COLORS.length].solid
                    return (
                      <div
                        key={row.category}
                        className="w-full flex items-center justify-between px-2 py-1 rounded-md text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="truncate text-left" style={{ maxWidth: 140 }}>
                            {row.category.slice(0, 5)}
                          </span>
                        </div>
                        <span className="tabular-nums text-muted-foreground ml-2 shrink-0">
                          {formatINR(row.totalReceipts - row.totalExpenditure)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted">
                  <th className="px-4 py-3 text-left font-medium w-8" />
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-right font-medium">Total Receipts</th>
                  <th className="px-4 py-3 text-right font-medium">Total Expenditures</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {summaryCategoryData.map((row) => {
                  const idx = categories.indexOf(row.category)
                  const isExpanded = expandedRows.has(row.category)
                  const color = RICH_COLORS[idx % RICH_COLORS.length].solid
                  const hasSubCategories = row.subCategories.length > 0
                  const pct = row.totalReceipts > 0 ? Math.min((row.totalExpenditure / row.totalReceipts) * 100, 100) : 0

                  return (
                    <React.Fragment key={row.category}>
                      <tr
                        onClick={() => hasSubCategories && toggleRow(row.category)}
                        className={`border-b transition-colors ${hasSubCategories ? "cursor-pointer hover:bg-muted/50" : ""}`}
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {hasSubCategories && (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <div className="mb-1.5">{row.category}</div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">{formatINR(row.totalReceipts)}</td>
                        <td className="px-4 py-3 text-right">{formatINR(row.totalExpenditure)}</td>
                        <td className={`px-4 py-3 text-right font-bold ${row.balance < 0 ? "text-red-700" : "text-green-700"}`}>
                          {formatINR(row.balance)}
                        </td>
                      </tr>

                      {isExpanded && row.subCategories.map(sub => (
                        <tr key={`${row.category}-${sub.subCategory}`} className="border-b bg-muted">
                          <td className="px-4 py-2" />
                          <td className="px-4 py-2 pl-8 text-muted-foreground">{sub.subCategory}</td>
                          <td className="px-4 py-2 text-right text-muted-foreground">—</td>
                          <td className="px-4 py-2 text-right text-muted-foreground">{formatINR(sub.totalExpenditure)}</td>
                          <td className="px-4 py-2 text-right text-muted-foreground">
                            {sub.totalExpenditure > 0 ? formatINR(-sub.totalExpenditure) : "—"}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })}
              </tbody>
              <tfoot className="border-t bg-muted/70">
                <tr>
                  <td className="px-4 py-4" />
                  <td className="px-4 py-4 font-semibold">
                    <div className="flex flex-col gap-2">
                      <span>Grand Total</span>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full transition-all duration-500 bg-foreground"
                          style={{ width: `${grandPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{grandPct.toFixed(1)}% utilised</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-semibold">{formatINR(grandTotals.totalReceipts)}</td>
                  <td className="px-4 py-4 text-right font-semibold">{formatINR(grandTotals.totalExpenditure)}</td>
                  <td className={`px-4 py-4 text-right font-bold ${grandTotals.balance < 0 ? "text-red-700" : "text-green-700"}`}>
                    {formatINR(grandTotals.balance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
