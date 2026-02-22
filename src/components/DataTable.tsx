import React, { useMemo, useState } from "react"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type Column<T> = {
  key: keyof T
  label: string
  sortable?: boolean
  format?: (val: T[keyof T], row: T) => React.ReactNode
  className?: string
}

export type Filter<T> = {
  key: string
  label?: string
  type: "text" | "number" | "date" | "select"
  options?: string[]
  placeholder?: string
  filterFn?: (row: T, value: string) => boolean
}

type DataTableProps<T> = {
  data: T[]
  columns: Column<T>[]
  filters?: Filter<T>[]
  defaultSort?: keyof T
  defaultSortDirection?: "asc" | "desc"
  title?: string
  dynamicSelectOptions?: Record<string, (filterValues: Record<string, string>) => string[]>
  rowsPerPage?: number
  performPagination?: boolean
  showResultCount?: boolean
  truncateLength?: number
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
  onItemsPerPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  itemsPerPage: number
  totalItems: number
  onItemsPerPageChange: (n: number) => void
}) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push("...")
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i)
      }
      if (currentPage < totalPages - 2) pages.push("...")
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t mt-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Show</span>
        <Select
          value={String(itemsPerPage)}
          onValueChange={v => { onItemsPerPageChange(Number(v)); onPageChange(1) }}
        >
          <SelectTrigger className="h-8 w-16 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 20, 50].map(n => (
              <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>rows per page</span>
        {totalItems > 0 && (
          <span className="hidden sm:inline text-xs">
            — {startItem}–{endItem} of {totalItems}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {getPageNumbers().map((page, i) =>
          page === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm select-none">…</span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 text-xs"
              onClick={() => onPageChange(page as number)}
            >
              {page}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  filters = [],
  defaultSort,
  defaultSortDirection = "desc",
  title,
  dynamicSelectOptions = {},
  rowsPerPage: initialRowsPerPage = 5,
  performPagination = true,
  showResultCount = true,
  truncateLength = 36,
}: DataTableProps<T>) {
  const [filterValues, setFilterValues] = useState<Record<string, string>>(
    Object.fromEntries(filters.map(f => [f.key, ""]))
  )

  const [sortConfig, setSortConfig] = useState<{ key: keyof T | null; direction: "asc" | "desc" }>({
    key: defaultSort || null,
    direction: defaultSortDirection,
  })

  const [currentPage, setCurrentPage] = useState(1)

  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage)

  const truncate = (val: unknown): React.ReactNode => {
    if (typeof val !== "string") return val as React.ReactNode
    if (!truncateLength || val.length <= truncateLength) return val
    return val.slice(0, truncateLength) + "…"
  }

  const updateFilter = (key: string, value: string) => {
    setFilterValues(prev => {
      const newValues = { ...prev, [key]: value }
      if (key === "category" && "subCategory" in newValues) {
        newValues["subCategory"] = ""
      }
      setCurrentPage(1)
      return newValues
    })
  }

  const requestSort = (key: keyof T) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key ? (prev.direction === "asc" ? "desc" : "asc") : "asc",
    }))
  }

  const processed = useMemo(() => {
    const filtered = data.filter(row => {
      return filters.every(f => {
        const fv = filterValues[f.key]
        if (!fv || fv === "all") return true
        if (f.filterFn) return f.filterFn(row, fv)
        const val = row[f.key as keyof T]
        if (f.type === "text") return String(val).toLowerCase().includes(fv.toLowerCase())
        if (f.type === "number") return (val as number) >= +fv
        if (f.type === "date") return new Date(val as string | Date) >= new Date(fv)
        if (f.type === "select") return val === fv
        return true
      })
    })

    if (!sortConfig.key) return filtered

    return filtered.sort((a, b) => {
      const key = sortConfig.key!
      const aVal = a[key]
      const bVal = b[key]

      if (aVal instanceof Date && bVal instanceof Date)
        return sortConfig.direction === "asc" ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime()
      if (typeof aVal === "number" && typeof bVal === "number")
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal
      return sortConfig.direction === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })
  }, [data, filterValues, sortConfig, filters])

  const totalPages = performPagination ? Math.max(1, Math.ceil(processed.length / rowsPerPage)) : 1
  const safePage = Math.min(currentPage, totalPages)

  const paginatedData = useMemo(() => {
    if (!performPagination) return processed
    const start = (safePage - 1) * rowsPerPage
    return processed.slice(start, start + rowsPerPage)
  }, [processed, safePage, rowsPerPage, performPagination])

  const arrow = (key: keyof T) => (sortConfig.key === key ? (sortConfig.direction === "asc" ? " ↑" : " ↓") : "")
  const isRangeFilter = (key: string) => key.endsWith("Min") || key.endsWith("Max") || key === "dateFrom" || key === "dateTo"

  return (
    <div className="w-full py-2">
      {title && <h2 className="text-2xl font-semibold mb-4">{title}</h2>}

      {filters.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-2">
            {filters.filter(f => !isRangeFilter(f.key)).map(f => (
              <div key={f.key}>
                <label className="text-sm font-medium block mb-2">{f.label || f.key}</label>

                {f.type === "text" && (
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      className="pl-8"
                      placeholder={f.placeholder}
                      value={filterValues[f.key]}
                      onChange={e => updateFilter(f.key, e.target.value)}
                    />
                  </div>
                )}

                {f.type === "select" && (
                  <Select
                    value={filterValues[f.key] || "all"}
                    onValueChange={v => updateFilter(f.key, v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {(dynamicSelectOptions[f.key]?.(filterValues) || f.options || []).map(opt => (
                        <SelectItem key={opt} value={opt} title={opt}>
                          {truncate(opt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>

          {filters.some(f => isRangeFilter(f.key)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4">
              {filters.filter(f => isRangeFilter(f.key)).map(f => (
                <div key={f.key}>
                  <label className="text-sm font-medium block mb-2">{f.label || f.key}</label>
                  {f.type === "number" && (
                    <Input
                      type="number"
                      placeholder={f.placeholder}
                      value={filterValues[f.key]}
                      onChange={e => updateFilter(f.key, e.target.value)}
                    />
                  )}
                  {f.type === "date" && (
                    <Input
                      type="date"
                      value={filterValues[f.key]}
                      onChange={e => updateFilter(f.key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Table>
        <TableHeader className="bg-primary">
          <TableRow>
            <TableHead className="text-background">S.No</TableHead>
            {columns.map(col => (
              <TableHead
                key={col.key as string}
                onClick={col.sortable ? () => requestSort(col.key) : undefined}
                className={`${col.sortable ? "cursor-pointer" : ""} ${col.className || ""} text-background`}
              >
                {col.label}{col.sortable && arrow(col.key)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length ? (
            paginatedData.map((row, i) => (
              <TableRow key={i}>
                <TableCell>{(safePage - 1) * rowsPerPage + i + 1}</TableCell>
                {columns.map(col => (
                  <TableCell
                    key={col.key as string}
                    className={col.className}
                    title={String(row[col.key] ?? "")}
                  >
                    {col.format ? col.format(row[col.key], row) : truncate(row[col.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="text-center py-4 text-gray-500">
                No data found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {performPagination && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={rowsPerPage}
          totalItems={processed.length}
          onItemsPerPageChange={n => { setRowsPerPage(n); setCurrentPage(1) }}
        />
      )}

      {showResultCount && (
        <div className="flex flex-row items-end justify-end w-full text-xs mt-4">
          <b>{processed.length}</b>&nbsp;result(s) found
        </div>
      )}
    </div>
  )
}
