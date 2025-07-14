'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { X, Plus, Filter, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ExecutionFilters } from '@/types/execution'

interface FilterField {
  field: keyof ExecutionFilters
  label: string
  placeholder?: string
  type?: 'text' | 'select' | 'multiselect' | 'daterange'
  options?: string[]
}

interface FilterPill {
  field: keyof ExecutionFilters
  values: string[]
  label: string
  type: 'text' | 'select' | 'multiselect' | 'daterange'
}

interface ExecutionFilterPillsProps {
  filterFields: FilterField[]
  onFiltersChange: (filters: any[]) => void
  className?: string
}

// Predefined filter options
const EXECUTION_STATUS_OPTIONS = [
  'NEW',
  'SENT', 
  'FILLED',
  'PARTIALLY_FILLED',
  'CANCELLED',
  'CANCEL'
]

const TRADE_TYPE_OPTIONS = [
  'BUY',
  'SELL',
  'SHORT'
]

// Quick filter presets
const QUICK_FILTERS = [
  {
    label: 'Active',
    description: 'NEW, SENT, PARTIALLY_FILLED',
    filters: { executionStatus: ['NEW', 'SENT', 'PARTIALLY_FILLED'] }
  },
  {
    label: 'Filled',
    description: 'FILLED executions only',
    filters: { executionStatus: ['FILLED'] }
  },
  {
    label: 'Cancelled',
    description: 'CANCELLED, CANCEL executions',
    filters: { executionStatus: ['CANCELLED', 'CANCEL'] }
  },
  {
    label: 'Today',
    description: 'Executions from today',
    filters: { dateRange: 'today' }
  },
  {
    label: 'This Week',
    description: 'Executions from this week',
    filters: { dateRange: 'week' }
  }
]

export function ExecutionFilterPills({ 
  filterFields, 
  onFiltersChange,
  className = '' 
}: ExecutionFilterPillsProps) {
  const [activeFilters, setActiveFilters] = useState<FilterPill[]>([])
  const [newFilterField, setNewFilterField] = useState<string>('')
  const [newFilterValue, setNewFilterValue] = useState<string>('')
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' })

  // Get field configuration
  const getFieldConfig = useCallback((fieldName: string): FilterField | undefined => {
    return filterFields.find(f => f.field === fieldName)
  }, [filterFields]);

  // Get options for select fields
  const getFieldOptions = (fieldName: string): string[] => {
    const fieldConfig = getFieldConfig(fieldName)
    if (fieldConfig?.options) return fieldConfig.options
    
    switch (fieldName) {
      case 'executionStatus':
        return EXECUTION_STATUS_OPTIONS
      case 'tradeType':
        return TRADE_TYPE_OPTIONS
      default:
        return []
    }
  }

  // Convert internal filters to external format
  const convertFiltersForCallback = (filters: FilterPill[]) => {
    return filters.map(filter => ({
      field: filter.field,
      values: filter.values,
      label: filter.label
    }))
  }

  // Add a new filter
  const addFilter = (field: string, values: string | string[], type: 'text' | 'select' | 'multiselect' | 'daterange' = 'text') => {
    const fieldConfig = getFieldConfig(field)
    if (!fieldConfig) return

    const valueArray = Array.isArray(values) ? values : [values]
    if (valueArray.length === 0 || (valueArray.length === 1 && !valueArray[0].trim())) return

    const existingFilterIndex = activeFilters.findIndex(f => f.field === field)
    let updatedFilters: FilterPill[]

    if (existingFilterIndex >= 0) {
      // Update existing filter
      const existingFilter = activeFilters[existingFilterIndex]
      const newValues = type === 'multiselect' 
        ? valueArray 
        : [...existingFilter.values, ...valueArray.filter(v => !existingFilter.values.includes(v))]
      
      updatedFilters = activeFilters.map((filter, index) => 
        index === existingFilterIndex 
          ? { ...filter, values: newValues.filter(v => v.trim()) }
          : filter
      )
    } else {
      // Create new filter
      const newFilter: FilterPill = {
        field: field as keyof ExecutionFilters,
        values: valueArray.filter(v => v.trim()),
        label: fieldConfig.label,
        type
      }
      updatedFilters = [...activeFilters, newFilter]
    }

    setActiveFilters(updatedFilters)
    onFiltersChange(convertFiltersForCallback(updatedFilters))
    
    // Reset form state
    setNewFilterField('')
    setNewFilterValue('')
    setSelectedOptions([])
    setDateRange({ from: '', to: '' })
  }

  // Remove a specific filter value
  const removeFilterValue = (field: string, value: string) => {
    const updatedFilters = activeFilters.map(filter => {
      if (filter.field === field) {
        const newValues = filter.values.filter(v => v !== value)
        return { ...filter, values: newValues }
      }
      return filter
    }).filter(filter => filter.values.length > 0)

    setActiveFilters(updatedFilters)
    onFiltersChange(convertFiltersForCallback(updatedFilters))
  }

  // Remove entire filter
  const removeFilter = (field: string) => {
    const updatedFilters = activeFilters.filter(f => f.field !== field)
    setActiveFilters(updatedFilters)
    onFiltersChange(convertFiltersForCallback(updatedFilters))
  }

  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters([])
    onFiltersChange([])
  }

  // Apply quick filter preset
  const applyQuickFilter = (preset: typeof QUICK_FILTERS[0]) => {
    const newFilters: FilterPill[] = []
    
    Object.entries(preset.filters).forEach(([field, values]) => {
      const fieldConfig = getFieldConfig(field)
      if (fieldConfig) {
        if (field === 'dateRange') {
          // Handle date range presets
          const today = new Date()
          let fromDate = new Date()
          
          switch (values) {
            case 'today':
              fromDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
              break
            case 'week':
              fromDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
              break
          }
          
          newFilters.push({
            field: 'receivedTimestamp' as keyof ExecutionFilters,
            values: [`${fromDate.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`],
            label: 'Date Range',
            type: 'daterange'
          })
        } else {
          newFilters.push({
            field: field as keyof ExecutionFilters,
            values: Array.isArray(values) ? values : [values],
            label: fieldConfig.label,
            type: Array.isArray(values) ? 'multiselect' : 'text'
          })
        }
      }
    })
    
    setActiveFilters(newFilters)
    onFiltersChange(convertFiltersForCallback(newFilters))
  }

  // Handle adding text filter
  const handleAddTextFilter = () => {
    if (newFilterField && newFilterValue.trim()) {
      addFilter(newFilterField, newFilterValue.trim(), 'text')
    }
  }

  // Handle adding multiselect filter
  const handleAddMultiselectFilter = () => {
    if (newFilterField && selectedOptions.length > 0) {
      addFilter(newFilterField, selectedOptions, 'multiselect')
    }
  }

  // Handle adding date range filter
  const handleAddDateRangeFilter = () => {
    if (newFilterField && dateRange.from && dateRange.to) {
      const rangeValue = `${dateRange.from} to ${dateRange.to}`
      addFilter(newFilterField, rangeValue, 'daterange')
    }
  }

  // Get current field type
  const currentFieldType = useMemo(() => {
    const fieldConfig = getFieldConfig(newFilterField)
    return fieldConfig?.type || 'text'
  }, [newFilterField, getFieldConfig])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Quick Filter Presets */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700 flex items-center">
          Quick Filters:
        </span>
        {QUICK_FILTERS.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => applyQuickFilter(preset)}
            className="h-7 text-xs"
            title={preset.description}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Active Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {activeFilters.map((filter) => (
          <div key={filter.field} className="flex flex-wrap gap-1">
            {filter.values.map((value) => (
              <Badge
                key={`${filter.field}-${value}`}
                variant="secondary"
                className="flex items-center gap-1 px-3 py-1 text-sm"
              >
                <span className="font-medium text-slate-600">
                  {filter.label}:
                </span>
                <span>{value}</span>
                <button
                  onClick={() => removeFilterValue(filter.field, value)}
                  className="ml-1 hover:bg-slate-200 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${filter.label}: ${value} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ))}
      </div>

      {/* Add Filter Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Plus className="h-4 w-4 mr-1" />
              Add Filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            <DropdownMenuLabel>Add Filter</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <div className="p-3 space-y-3">
              {/* Field Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Field</Label>
                <select
                  value={newFilterField}
                  onChange={(e) => setNewFilterField(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="">Select field...</option>
                  {filterFields.map((field) => (
                    <option key={field.field} value={field.field}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Value Input - Text */}
              {newFilterField && currentFieldType === 'text' && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Value</Label>
                  <Input
                    placeholder={getFieldConfig(newFilterField)?.placeholder || 'Enter value...'}
                    value={newFilterValue}
                    onChange={(e) => setNewFilterValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTextFilter()}
                    className="text-sm"
                  />
                  <Button
                    onClick={handleAddTextFilter}
                    disabled={!newFilterValue.trim()}
                    size="sm"
                    className="w-full"
                  >
                    Add Filter
                  </Button>
                </div>
              )}

              {/* Value Input - Multiselect */}
              {newFilterField && (currentFieldType === 'select' || currentFieldType === 'multiselect') && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Values</Label>
                  <div className="max-h-32 overflow-y-auto space-y-1 border rounded p-2">
                    {getFieldOptions(newFilterField).map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${newFilterField}-${option}`}
                          checked={selectedOptions.includes(option)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedOptions([...selectedOptions, option])
                            } else {
                              setSelectedOptions(selectedOptions.filter(o => o !== option))
                            }
                          }}
                        />
                        <Label 
                          htmlFor={`${newFilterField}-${option}`}
                          className="text-sm font-normal"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleAddMultiselectFilter}
                    disabled={selectedOptions.length === 0}
                    size="sm"
                    className="w-full"
                  >
                    Add Filter ({selectedOptions.length} selected)
                  </Button>
                </div>
              )}

              {/* Value Input - Date Range */}
              {newFilterField && currentFieldType === 'daterange' && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Date Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-gray-500">From</Label>
                      <Input
                        type="date"
                        value={dateRange.from}
                        onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">To</Label>
                      <Input
                        type="date"
                        value={dateRange.to}
                        onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleAddDateRangeFilter}
                    disabled={!dateRange.from || !dateRange.to}
                    size="sm"
                    className="w-full"
                  >
                    Add Date Range Filter
                  </Button>
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear All Button */}
        {activeFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 text-slate-500 hover:text-slate-700"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}

        {/* Filter Count */}
        {activeFilters.length > 0 && (
          <div className="flex items-center text-sm text-slate-500">
            <Filter className="h-4 w-4 mr-1" />
            {activeFilters.length} filter{activeFilters.length !== 1 ? 's' : ''} active
          </div>
        )}
      </div>
    </div>
  )
} 