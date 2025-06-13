'use client'

import React from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { OrderSortConfig } from '@/types/order'

export interface SortableColumn {
  key: string
  label: string
  sortable?: boolean
  className?: string
  render?: (value: any, row: any) => React.ReactNode
}

interface SortableTableProps {
  columns: SortableColumn[]
  data: any[]
  sort: OrderSortConfig[]
  onSortChange: (sort: OrderSortConfig[]) => void
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export function SortableTable({
  columns,
  data,
  sort,
  onSortChange,
  loading = false,
  emptyMessage = 'No data available',
  className = ''
}: SortableTableProps) {
  const handleSort = (field: string) => {
    const existingSort = sort.find(s => s.field === field)
    
    if (existingSort) {
      if (existingSort.direction === 'asc') {
        // Change to descending
        const newSort = sort.map(s => 
          s.field === field ? { ...s, direction: 'desc' as const } : s
        )
        onSortChange(newSort)
      } else {
        // Remove sort
        const newSort = sort.filter(s => s.field !== field)
        onSortChange(newSort)
      }
    } else {
      // Add ascending sort
      const newSort = [...sort, { field, direction: 'asc' as const }]
      onSortChange(newSort)
    }
  }

  const getSortIcon = (field: string) => {
    const sortConfig = sort.find(s => s.field === field)
    
    if (!sortConfig) {
      return <ChevronsUpDown className="h-4 w-4 text-slate-400" />
    }
    
    if (sortConfig.direction === 'asc') {
      return <ChevronUp className="h-4 w-4 text-slate-600" />
    }
    
    return <ChevronDown className="h-4 w-4 text-slate-600" />
  }

  const getSortPriority = (field: string) => {
    const index = sort.findIndex(s => s.field === field)
    return index >= 0 ? index + 1 : null
  }

  const renderCellValue = (column: SortableColumn, row: any) => {
    const value = getNestedValue(row, column.key)
    
    if (column.render) {
      return column.render(value, row)
    }
    
    return value
  }

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  if (loading) {
    return (
      <div className={`border rounded-lg ${className}`}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    <div className="h-4 bg-slate-200 rounded animate-pulse" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className={`border rounded-lg ${className}`}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.sortable ? (
                  <Button
                    variant="ghost"
                    onClick={() => handleSort(column.key)}
                    className="h-auto p-0 font-semibold text-left justify-start hover:bg-transparent"
                  >
                    <span className="flex items-center gap-2">
                      {column.label}
                      {getSortIcon(column.key)}
                      {getSortPriority(column.key) && sort.length > 1 && (
                        <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                          {getSortPriority(column.key)}
                        </span>
                      )}
                    </span>
                  </Button>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={columns.length} 
                className="text-center py-8 text-slate-500"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow key={row.id || index}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {renderCellValue(column, row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
} 