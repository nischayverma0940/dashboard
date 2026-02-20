import React, { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
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
  title?: string
  dynamicSelectOptions?: Record<string, (filterValues: Record<string, string>) => string[]>
  rowsPerPage?: number
  performPagination?: boolean
  showResultCount?: boolean
  truncateLength?: number
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  filters = [],
  defaultSort,
  title,
  dynamicSelectOptions = {},
  rowsPerPage = 5,
  performPagination = true,
  showResultCount = true,
  truncateLength = 36,
}: DataTableProps<T>) {
  const [filterValues, setFilterValues] = useState<Record<string, string>>(
    Object.fromEntries(filters.map(f => [f.key, ""]))
  )

  const [sortConfig, setSortConfig] = useState<{ key: keyof T | null; direction: "asc" | "desc" }>({
    key: defaultSort || null,
    direction: "desc",
  })

  const [currentPage, setCurrentPage] = useState(1)

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

  const totalPages = performPagination ? Math.ceil(processed.length / rowsPerPage) : 1

  const paginatedData = useMemo(() => {
    if (!performPagination) return processed
    const start = (currentPage - 1) * rowsPerPage
    return processed.slice(start, start + rowsPerPage)
  }, [processed, currentPage, rowsPerPage, performPagination])

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
                <TableCell>{(currentPage - 1) * rowsPerPage + i + 1}</TableCell>
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
        <div className="flex justify-between items-center mt-4 text-sm">
          <div>
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              className="px-2 py-1 border rounded disabled:opacity-50"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              ‹
            </button>
            <button
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-2 py-1 border rounded disabled:opacity-50"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              ›
            </button>
          </div>
        </div>
      )}

      {showResultCount && (
        <div className="flex flex-row items-end justify-end w-full text-xs mt-4">
          <b>{processed.length}</b>&nbsp;result(s) found
        </div>
      )}
    </div>
  )
}
