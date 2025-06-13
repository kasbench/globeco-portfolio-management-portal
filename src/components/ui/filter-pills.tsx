'use client'

import React, { useState } from 'react'
import { X, Plus, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { OrderFilter, OrderQueryParams } from '@/types/order'

interface FilterPillsProps {
  filters: OrderFilter[]
  onFiltersChange: (filters: OrderFilter[]) => void
  availableFields: {
    field: string
    label: string
    placeholder?: string
  }[]
  className?: string
}

export function FilterPills({ 
  filters, 
  onFiltersChange, 
  availableFields,
  className = '' 
}: FilterPillsProps) {
  const [newFilterField, setNewFilterField] = useState<string>('')
  const [newFilterValue, setNewFilterValue] = useState<string>('')

  const addFilter = (field: string, value: string) => {
    if (!field || !value.trim()) return

    const existingFilter = filters.find(f => f.field === field)
    if (existingFilter) {
      // Add value to existing filter if not already present
      if (!existingFilter.values.includes(value.trim())) {
        const updatedFilters = filters.map(f => 
          f.field === field 
            ? { ...f, values: [...f.values, value.trim()] }
            : f
        )
        onFiltersChange(updatedFilters)
      }
    } else {
      // Create new filter
      const fieldConfig = availableFields.find(af => af.field === field)
      const newFilter: OrderFilter = {
        field: field as keyof OrderQueryParams,
        values: [value.trim()],
        label: fieldConfig?.label || field
      }
      onFiltersChange([...filters, newFilter])
    }

    setNewFilterField('')
    setNewFilterValue('')
  }

  const removeFilterValue = (field: string, value: string) => {
    const updatedFilters = filters.map(filter => {
      if (filter.field === field) {
        const newValues = filter.values.filter(v => v !== value)
        return { ...filter, values: newValues }
      }
      return filter
    }).filter(filter => filter.values.length > 0)

    onFiltersChange(updatedFilters)
  }

  const removeFilter = (field: string) => {
    const updatedFilters = filters.filter(f => f.field !== field)
    onFiltersChange(updatedFilters)
  }

  const clearAllFilters = () => {
    onFiltersChange([])
  }

  const handleAddFilter = () => {
    if (newFilterField && newFilterValue) {
      addFilter(newFilterField, newFilterValue)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddFilter()
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
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
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Add Filter</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Field Selection */}
            <div className="p-2 space-y-2">
              <select
                value={newFilterField}
                onChange={(e) => setNewFilterField(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="">Select field...</option>
                {availableFields.map((field) => (
                  <option key={field.field} value={field.field}>
                    {field.label}
                  </option>
                ))}
              </select>

              {/* Value Input */}
              {newFilterField && (
                <Input
                  placeholder={
                    availableFields.find(f => f.field === newFilterField)?.placeholder || 
                    'Enter value...'
                  }
                  value={newFilterValue}
                  onChange={(e) => setNewFilterValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-sm"
                />
              )}

              {/* Add Button */}
              <Button
                onClick={handleAddFilter}
                disabled={!newFilterField || !newFilterValue.trim()}
                size="sm"
                className="w-full"
              >
                Add Filter
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear All Button */}
        {filters.length > 0 && (
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
        {filters.length > 0 && (
          <div className="flex items-center text-sm text-slate-500">
            <Filter className="h-4 w-4 mr-1" />
            {filters.length} filter{filters.length !== 1 ? 's' : ''} active
          </div>
        )}
      </div>
    </div>
  )
} 