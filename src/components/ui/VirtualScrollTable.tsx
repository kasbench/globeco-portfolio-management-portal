// Virtual Scrolling Table Component for Large Dataset Performance
// Handles efficient rendering of large tables with dynamic row heights

'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { FixedSizeList as List, VariableSizeList } from 'react-window'
import { areEqual } from 'react-window'
import memoize from 'memoize-one'

export interface VirtualTableColumn<T> {
  key: string
  header: React.ReactNode
  width: number | string
  minWidth?: number
  maxWidth?: number
  render: (item: T, index: number) => React.ReactNode
  sortable?: boolean
  resizable?: boolean
  sticky?: boolean
}

export interface VirtualTableProps<T> {
  data: T[]
  columns: VirtualTableColumn<T>[]
  height: number
  rowHeight?: number | ((index: number) => number)
  overscan?: number
  className?: string
  loading?: boolean
  loadingComponent?: React.ComponentType
  emptyComponent?: React.ComponentType
  onScroll?: (scrollTop: number, scrollLeft: number) => void
  onRowClick?: (item: T, index: number) => void
  onRowSelect?: (selectedItems: T[], selectedIndices: number[]) => void
  selectable?: boolean
  multiSelect?: boolean
  selectedItems?: Set<number>
  stickyHeader?: boolean
  estimatedRowHeight?: number
  cacheKey?: string
}

interface RowProps<T> {
  index: number
  style: React.CSSProperties
  data: {
    items: T[]
    columns: VirtualTableColumn<T>[]
    onRowClick?: (item: T, index: number) => void
    onRowSelect?: (index: number, selected: boolean) => void
    selectedItems?: Set<number>
    selectable?: boolean
    multiSelect?: boolean
  }
}

// Memoized row component for performance
const VirtualTableRow = React.memo(<T,>({ 
  index, 
  style, 
  data: { items, columns, onRowClick, onRowSelect, selectedItems, selectable, multiSelect } 
}: RowProps<T>) => {
  const item = items[index]
  const isSelected = selectedItems?.has(index) || false

  const handleRowClick = useCallback(() => {
    onRowClick?.(item, index)
  }, [item, index, onRowClick])

  const handleSelectChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onRowSelect?.(index, e.target.checked)
  }, [index, onRowSelect])

  return (
    <div
      style={style}
      className={`virtual-table-row ${isSelected ? 'selected' : ''} ${
        onRowClick ? 'clickable' : ''
      }`}
      onClick={handleRowClick}
    >
      <div className="virtual-table-row-content">
        {selectable && (
          <div className="virtual-table-cell selection-cell">
            <input
              type={multiSelect ? 'checkbox' : 'radio'}
              checked={isSelected}
              onChange={handleSelectChange}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
        {columns.map((column) => (
          <div
            key={column.key}
            className={`virtual-table-cell ${column.sticky ? 'sticky' : ''}`}
            style={{
              width: column.width,
              minWidth: column.minWidth,
              maxWidth: column.maxWidth,
            }}
          >
            {column.render(item, index)}
          </div>
        ))}
      </div>
    </div>
  )
}, areEqual) as <T>(props: RowProps<T>) => JSX.Element

// Header component
interface HeaderProps<T> {
  columns: VirtualTableColumn<T>[]
  selectable?: boolean
  multiSelect?: boolean
  allSelected?: boolean
  someSelected?: boolean
  onSelectAll?: (selected: boolean) => void
  onSort?: (columnKey: string, direction: 'asc' | 'desc') => void
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
}

const VirtualTableHeader = React.memo(<T,>({
  columns,
  selectable,
  multiSelect,
  allSelected,
  someSelected,
  onSelectAll,
  onSort,
  sortColumn,
  sortDirection,
}: HeaderProps<T>) => {
  const handleSelectAllChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectAll?.(e.target.checked)
  }, [onSelectAll])

  const handleSortClick = useCallback((columnKey: string) => {
    if (!onSort) return
    
    const newDirection = 
      sortColumn === columnKey && sortDirection === 'asc' ? 'desc' : 'asc'
    onSort(columnKey, newDirection)
  }, [sortColumn, sortDirection, onSort])

  return (
    <div className="virtual-table-header">
      {selectable && multiSelect && (
        <div className="virtual-table-header-cell selection-cell">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(input) => {
              if (input) {
                input.indeterminate = someSelected && !allSelected
              }
            }}
            onChange={handleSelectAllChange}
          />
        </div>
      )}
      {columns.map((column) => (
        <div
          key={column.key}
          className={`virtual-table-header-cell ${column.sortable ? 'sortable' : ''} ${
            column.sticky ? 'sticky' : ''
          }`}
          style={{
            width: column.width,
            minWidth: column.minWidth,
            maxWidth: column.maxWidth,
          }}
          onClick={column.sortable ? () => handleSortClick(column.key) : undefined}
        >
          <span className="header-content">{column.header}</span>
          {column.sortable && sortColumn === column.key && (
            <span className={`sort-indicator ${sortDirection}`}>
              {sortDirection === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}) as <T>(props: HeaderProps<T>) => JSX.Element

// Main virtual table component
export function VirtualScrollTable<T>({
  data,
  columns,
  height,
  rowHeight = 40,
  overscan = 10,
  className = '',
  loading = false,
  loadingComponent: LoadingComponent,
  emptyComponent: EmptyComponent,
  onScroll,
  onRowClick,
  onRowSelect,
  selectable = false,
  multiSelect = false,
  selectedItems = new Set(),
  stickyHeader = true,
  estimatedRowHeight = 40,
  cacheKey
}: VirtualTableProps<T>) {
  const listRef = useRef<List | VariableSizeList>(null)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(selectedItems)
  const [sortColumn, setSortColumn] = useState<string>()
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Memoized sorted data
  const sortedData = useMemo(() => {
    if (!sortColumn) return data

    const column = columns.find(col => col.key === sortColumn)
    if (!column) return data

    return [...data].sort((a, b) => {
      const aValue = column.render(a, 0) // Get rendered value for comparison
      const bValue = column.render(b, 0)
      
      const aStr = String(aValue)
      const bStr = String(bValue)
      
      const comparison = aStr.localeCompare(bStr, undefined, { numeric: true })
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, sortColumn, sortDirection, columns])

  // Memoized row data
  const rowData = useMemo(() => ({
    items: sortedData,
    columns,
    onRowClick,
    onRowSelect: handleRowSelect,
    selectedItems: selectedIndices,
    selectable,
    multiSelect,
  }), [sortedData, columns, onRowClick, selectedIndices, selectable, multiSelect])

  // Row selection handler
  function handleRowSelect(index: number, selected: boolean) {
    setSelectedIndices(prev => {
      const newSelected = new Set(prev)
      
      if (!multiSelect) {
        newSelected.clear()
      }
      
      if (selected) {
        newSelected.add(index)
      } else {
        newSelected.delete(index)
      }
      
      // Notify parent of selection change
      const selectedItems = Array.from(newSelected).map(i => sortedData[i])
      onRowSelect?.(selectedItems, Array.from(newSelected))
      
      return newSelected
    })
  }

  // Select all handler
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      const allIndices = new Set(Array.from({ length: sortedData.length }, (_, i) => i))
      setSelectedIndices(allIndices)
      onRowSelect?.(sortedData, Array.from(allIndices))
    } else {
      setSelectedIndices(new Set())
      onRowSelect?.([], [])
    }
  }, [sortedData, onRowSelect])

  // Sort handler
  const handleSort = useCallback((columnKey: string, direction: 'asc' | 'desc') => {
    setSortColumn(columnKey)
    setSortDirection(direction)
    // Clear selection on sort to avoid confusion
    setSelectedIndices(new Set())
    onRowSelect?.([], [])
  }, [onRowSelect])

  // Scroll handler
  const handleScroll = useCallback(({ scrollTop, scrollLeft }: { scrollTop: number; scrollLeft: number }) => {
    onScroll?.(scrollTop, scrollLeft)
  }, [onScroll])

  // Dynamic row height function
  const getRowHeight = useMemo(() => {
    if (typeof rowHeight === 'function') {
      return memoize(rowHeight)
    }
    return () => rowHeight as number
  }, [rowHeight])

  // Selection state
  const allSelected = selectedIndices.size === sortedData.length && sortedData.length > 0
  const someSelected = selectedIndices.size > 0 && selectedIndices.size < sortedData.length

  // Reset selection when data changes
  useEffect(() => {
    setSelectedIndices(selectedItems)
  }, [selectedItems])

  // Handle external cache key changes
  useEffect(() => {
    if (cacheKey && listRef.current) {
      // Force re-render when cache key changes
      listRef.current.scrollTo(0)
    }
  }, [cacheKey])

  if (loading && LoadingComponent) {
    return <LoadingComponent />
  }

  if (!loading && sortedData.length === 0 && EmptyComponent) {
    return <EmptyComponent />
  }

  const headerHeight = stickyHeader ? 40 : 0
  const listHeight = height - headerHeight

  return (
    <div className={`virtual-scroll-table ${className}`}>
      {stickyHeader && (
        <VirtualTableHeader
          columns={columns}
          selectable={selectable}
          multiSelect={multiSelect}
          allSelected={allSelected}
          someSelected={someSelected}
          onSelectAll={handleSelectAll}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
        />
      )}
      
      <div className="virtual-table-body">
        {typeof rowHeight === 'function' ? (
          <VariableSizeList
            ref={listRef}
            height={listHeight}
            itemCount={sortedData.length}
            itemSize={getRowHeight}
            itemData={rowData}
            overscanCount={overscan}
            onScroll={handleScroll}
            estimatedItemSize={estimatedRowHeight}
          >
            {VirtualTableRow}
          </VariableSizeList>
        ) : (
          <List
            ref={listRef}
            height={listHeight}
            itemCount={sortedData.length}
            itemSize={rowHeight as number}
            itemData={rowData}
            overscanCount={overscan}
            onScroll={handleScroll}
          >
            {VirtualTableRow}
          </List>
        )}
      </div>

      <style jsx>{`
        .virtual-scroll-table {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .virtual-table-header {
          display: flex;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          height: 40px;
          align-items: center;
          padding: 0 8px;
        }

        .virtual-table-header-cell {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          font-weight: 600;
          font-size: 14px;
          color: #374151;
          border-right: 1px solid #e5e7eb;
        }

        .virtual-table-header-cell:last-child {
          border-right: none;
        }

        .virtual-table-header-cell.sortable {
          cursor: pointer;
          user-select: none;
        }

        .virtual-table-header-cell.sortable:hover {
          background-color: #f3f4f6;
        }

        .virtual-table-header-cell.sticky {
          position: sticky;
          left: 0;
          z-index: 10;
          background-color: #f9fafb;
        }

        .sort-indicator {
          margin-left: 4px;
          font-size: 12px;
        }

        .virtual-table-body {
          position: relative;
        }

        .virtual-table-row {
          display: flex;
          border-bottom: 1px solid #f3f4f6;
        }

        .virtual-table-row.clickable {
          cursor: pointer;
        }

        .virtual-table-row.clickable:hover {
          background-color: #f9fafb;
        }

        .virtual-table-row.selected {
          background-color: #dbeafe;
        }

        .virtual-table-row-content {
          display: flex;
          width: 100%;
          align-items: center;
          padding: 0 8px;
        }

        .virtual-table-cell {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          font-size: 14px;
          color: #1f2937;
          border-right: 1px solid #f3f4f6;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .virtual-table-cell:last-child {
          border-right: none;
        }

        .virtual-table-cell.sticky {
          position: sticky;
          left: 0;
          z-index: 5;
          background-color: white;
        }

        .selection-cell {
          width: 40px;
          min-width: 40px;
          max-width: 40px;
          justify-content: center;
        }

        .selection-cell input {
          margin: 0;
        }
      `}</style>
    </div>
  )
} 