'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Plus, Trash2, Save, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { Model, ModelCreateRequest, ModelUpdateRequest } from '@/types/model'
import { usePortfolios } from '@/lib/hooks/usePortfolios'

// Form validation schema
const modelFormSchema = z.object({
  name: z.string().min(1, 'Model name is required').max(255, 'Name must be less than 255 characters'),
  portfolios: z.array(z.string().min(1, 'Portfolio name is required')).min(1, 'At least one portfolio is required'),
  positions: z.array(z.object({
    security_id: z.string().length(24, 'Security ID must be exactly 24 characters'),
    target: z.number().min(0, 'Target must be >= 0').max(0.95, 'Target must be <= 0.95'),
    high_drift: z.number().min(0, 'High drift must be >= 0').max(1, 'High drift must be <= 1'),
    low_drift: z.number().min(0, 'Low drift must be >= 0').max(1, 'Low drift must be <= 1'),
  })).optional(),
})

type ModelFormData = z.infer<typeof modelFormSchema>

interface ModelFormProps {
  model?: Model | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ModelCreateRequest | ModelUpdateRequest) => void
  isLoading?: boolean
}

export default function ModelForm({ model, isOpen, onClose, onSubmit, isLoading = false }: ModelFormProps) {
  const [selectedPortfolio, setSelectedPortfolio] = useState('')
  
  // Get portfolios for name mapping
  const { portfolioOptions, getPortfolioNames, getPortfolioIds, isLoading: portfoliosLoading } = usePortfolios()

  const form = useForm<ModelFormData>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: {
      name: '',
      portfolios: [],
      positions: [],
    },
  })
  
  // Reset form when model changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPortfolio('') // Clear portfolio selection
      
      if (model) {
        // Convert portfolio IDs to names for form display
        const portfolioNamesFromModel = getPortfolioNames(model.portfolios)
        
        form.reset({
          name: model.name,
          portfolios: portfolioNamesFromModel,
          positions: model.positions?.map(p => ({
            security_id: p.security_id,
            target: parseFloat(p.target),
            high_drift: parseFloat(p.high_drift),
            low_drift: parseFloat(p.low_drift),
          })) || [],
        })
      } else {
        // Reset for new model
        form.reset({
          name: '',
          portfolios: [],
          positions: [],
        })
      }
    }
  }, [model?.model_id, isOpen]) // Only depend on model ID and dialog state

  const { fields: positionFields, append: addPosition, remove: removePosition } = useFieldArray({
    control: form.control,
    name: 'positions',
  })

  const portfolios = form.watch('portfolios')

  const handleSubmit = (data: ModelFormData) => {
    // Convert portfolio names back to IDs for API submission
    const portfolioIds = getPortfolioIds(data.portfolios)
    
    if (model) {
      // Update existing model
      const updateData: ModelUpdateRequest = {
        name: data.name,
        portfolios: portfolioIds,
        positions: data.positions,
        version: model.version,
        last_rebalance_date: model.last_rebalance_date,
      }
      onSubmit(updateData)
    } else {
      // Create new model
      const createData: ModelCreateRequest = {
        name: data.name,
        portfolios: portfolioIds,
        positions: data.positions,
      }
      onSubmit(createData)
    }
  }

  const addPortfolio = () => {
    if (selectedPortfolio && !portfolios.includes(selectedPortfolio)) {
      const currentPortfolios = form.getValues('portfolios')
      form.setValue('portfolios', [...currentPortfolios, selectedPortfolio])
      setSelectedPortfolio('')
    }
  }

  const removePortfolio = (index: number) => {
    const currentPortfolios = form.getValues('portfolios')
    form.setValue('portfolios', currentPortfolios.filter((_, i) => i !== index))
  }

  const addNewPosition = () => {
    addPosition({
      security_id: '',
      target: 0,
      high_drift: 0.05,
      low_drift: 0.05,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {model ? 'Edit Investment Model' : 'Create New Investment Model'}
          </DialogTitle>
          <DialogDescription>
            {model 
              ? 'Update the model configuration, portfolio assignments, and security positions.'
              : 'Configure a new investment model with portfolio assignments and security positions.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Model Name *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Enter model name"
                  className="mt-1"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>

              {model && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Model ID</Label>
                    <Input value={model.model_id} disabled className="mt-1 bg-gray-50" />
                  </div>
                  <div>
                    <Label>Version</Label>
                    <Input value={model.version} disabled className="mt-1 bg-gray-50" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Portfolio Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Portfolio Assignments *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio} disabled={portfoliosLoading}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={portfoliosLoading ? "Loading portfolios..." : "Select a portfolio"} />
                  </SelectTrigger>
                  <SelectContent>
                    {portfolioOptions
                      .filter(option => !portfolios.includes(option.label))
                      .map((option) => (
                        <SelectItem key={option.value} value={option.label}>
                          {option.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button 
                  type="button" 
                  onClick={addPortfolio} 
                  size="sm"
                  disabled={!selectedPortfolio || portfoliosLoading}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {portfolios.map((portfolio, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {portfolio}
                    <button
                      type="button"
                      onClick={() => removePortfolio(index)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              {form.formState.errors.portfolios && (
                <p className="text-sm text-red-600">{form.formState.errors.portfolios.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Positions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Security Positions
                <Button type="button" onClick={addNewPosition} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Position
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {positionFields.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No positions added. Click "Add Position" to start.
                </p>
              ) : (
                <div className="space-y-4">
                  {positionFields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Position {index + 1}</h4>
                        <Button
                          type="button"
                          onClick={() => removePosition(index)}
                          size="sm"
                          variant="destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <Label htmlFor={`positions.${index}.security_id`}>Security ID *</Label>
                          <Input
                            {...form.register(`positions.${index}.security_id`)}
                            placeholder="24-character security ID"
                            className="mt-1"
                          />
                          {form.formState.errors.positions?.[index]?.security_id && (
                            <p className="text-sm text-red-600 mt-1">
                              {form.formState.errors.positions[index]?.security_id?.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor={`positions.${index}.target`}>Target Allocation *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="0.95"
                            {...form.register(`positions.${index}.target`, { valueAsNumber: true })}
                            placeholder="0.00 - 0.95"
                            className="mt-1"
                          />
                          {form.formState.errors.positions?.[index]?.target && (
                            <p className="text-sm text-red-600 mt-1">
                              {form.formState.errors.positions[index]?.target?.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor={`positions.${index}.high_drift`}>High Drift *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            {...form.register(`positions.${index}.high_drift`, { valueAsNumber: true })}
                            placeholder="0.00 - 1.00"
                            className="mt-1"
                          />
                          {form.formState.errors.positions?.[index]?.high_drift && (
                            <p className="text-sm text-red-600 mt-1">
                              {form.formState.errors.positions[index]?.high_drift?.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor={`positions.${index}.low_drift`}>Low Drift *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            {...form.register(`positions.${index}.low_drift`, { valueAsNumber: true })}
                            placeholder="0.00 - 1.00"
                            className="mt-1"
                          />
                          {form.formState.errors.positions?.[index]?.low_drift && (
                            <p className="text-sm text-red-600 mt-1">
                              {form.formState.errors.positions[index]?.low_drift?.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {model ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {model ? 'Update Model' : 'Create Model'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 