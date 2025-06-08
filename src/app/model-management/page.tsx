'use client'

import { useState } from 'react'
import { Plus, TrendingUp, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useModels } from '@/lib/hooks/useModels'
import ModelsTable from '@/components/tables/ModelsTable'
import ModelForm from '@/components/forms/ModelForm'
import { Model, ModelCreateRequest, ModelUpdateRequest } from '@/types/model'

export default function ModelManagementPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<Model | null>(null)

  const {
    models,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    loadMore,
    sortConfig,
    handleSort,
    createModel,
    updateModel,
    rebalanceModel,
    isCreating,
    isUpdating,
    isRebalancing,
    createError,
    updateError,
    rebalanceError,
    refetch,
  } = useModels()

  const handleCreate = () => {
    setEditingModel(null)
    setIsFormOpen(true)
  }

  const handleEdit = (model: Model) => {
    setEditingModel(model)
    setIsFormOpen(true)
  }

  const handleFormSubmit = (data: ModelCreateRequest | ModelUpdateRequest) => {
    if (editingModel) {
      updateModel(
        { modelId: editingModel.model_id, model: data as ModelUpdateRequest },
        {
          onSuccess: () => {
            setIsFormOpen(false)
            setEditingModel(null)
          },
        }
      )
    } else {
      createModel(data as ModelCreateRequest, {
        onSuccess: () => {
          setIsFormOpen(false)
        },
      })
    }
  }

  const handleRebalance = (modelId: string) => {
    rebalanceModel(modelId)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingModel(null)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Investment Models</h1>
                  <p className="text-slate-600">
                    Create and manage investment models with portfolio allocations and rebalancing rules
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={handleCreate} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Model
            </Button>
          </div>
        </div>

        {/* Error Alerts */}
        {createError && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Failed to create model: {createError.message}
            </AlertDescription>
          </Alert>
        )}

        {updateError && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Failed to update model: {updateError.message}
            </AlertDescription>
          </Alert>
        )}

        {rebalanceError && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Failed to rebalance model: {rebalanceError.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Models
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {models.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Active Portfolios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {new Set(models.flatMap(m => m.portfolios)).size}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {models.reduce((sum, model) => sum + (model.positions?.length || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Models Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Investment Models</span>
              <div className="text-sm font-normal text-slate-600">
                {models.length} models loaded
                {hasNextPage && ' (scroll for more)'}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ModelsTable
              models={models}
              isLoading={isLoading}
              isError={isError}
              error={error}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              loadMore={loadMore}
              sortConfig={sortConfig}
              onSort={handleSort}
              onEdit={handleEdit}
              onRebalance={handleRebalance}
              isRebalancing={isRebalancing}
            />
          </CardContent>
        </Card>

        {/* Model Form Dialog */}
        <ModelForm
          model={editingModel}
          isOpen={isFormOpen}
          onClose={handleFormClose}
          onSubmit={handleFormSubmit}
          isLoading={isCreating || isUpdating}
        />
      </div>
    </div>
  )
} 