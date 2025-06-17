'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { TradeOrderEnhancedResponseDTO } from '@/types/trade';
import { useDestinations } from '@/lib/hooks/useDestinations';
import { useTradeSubmission } from '@/lib/hooks/useTradeSubmission';
import { createSubmissionSummary, getSubmissionStatistics } from '@/lib/utils/tradeUtils';
import { TradeSubmissionTable } from './trade-submission-table';
import { SubmissionSummaryCard } from './submission-summary-card';
import { BulkActionsSection } from './bulk-actions-section';

interface TradeSubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tradeOrders: TradeOrderEnhancedResponseDTO[];
  onSubmissionComplete: () => void;
}

type SubmissionStep = 'configure' | 'review' | 'submitting' | 'complete';

export function TradeSubmissionModal({
  open,
  onOpenChange,
  tradeOrders,
  onSubmissionComplete
}: TradeSubmissionModalProps) {
  const [currentStep, setCurrentStep] = useState<SubmissionStep>('configure');
  
  // Load destinations
  const { 
    destinations, 
    destinationOptions, 
    loading: destinationsLoading, 
    error: destinationsError 
  } = useDestinations();

  // Manage submission state
  const {
    submissions,
    loading: submissionLoading,
    error: submissionError,
    setSubmissionQuantity,
    setSubmissionDestination,
    setAllDestinations,
    setAllRemainingQuantities,
    resetSubmissions,
    getSubmissionData,
    getValidationSummary,
    submitBatch,
    getSubmissionForOrder,
    isOrderConfigured
  } = useTradeSubmission(tradeOrders, destinationOptions[0]?.value);

  // Submission data and validation
  const submissionData = getSubmissionData();
  const validationSummary = getValidationSummary();
  const submissionSummary = useMemo(() => 
    createSubmissionSummary(submissionData, destinations),
    [submissionData, destinations]
  );
  const statistics = useMemo(() => 
    getSubmissionStatistics(submissionData),
    [submissionData]
  );

  // Check if we can proceed to next step
  const canProceedToReview = validationSummary.isValid && submissionData.length > 0;
  const canSubmit = validationSummary.isValid && submissionData.length > 0;

  const handleNext = () => {
    if (currentStep === 'configure' && canProceedToReview) {
      setCurrentStep('review');
    }
  };

  const handleBack = () => {
    if (currentStep === 'review') {
      setCurrentStep('configure');
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      setCurrentStep('submitting');
      const result = await submitBatch();
      
      // Check both possible field names (API uses 'successful', types define 'successCount')
      const successCount = (result as any).successful || result.successCount || 0;
      console.log('Submission result:', result, 'successCount:', successCount);
      
      if (successCount > 0) {
        setCurrentStep('complete');
        // Refresh data immediately
        console.log('Calling onSubmissionComplete callback...');
        onSubmissionComplete();
        // Auto-close modal after a brief delay for user feedback
        setTimeout(() => {
          onOpenChange(false);
          setCurrentStep('configure');
        }, 2000);
      } else {
        // Go back to configure step if all submissions failed
        setCurrentStep('configure');
      }
    } catch (error) {
      // Error handling is done in the hook, just go back to configure
      setCurrentStep('configure');
    }
  };

  const handleClose = () => {
    resetSubmissions();
    setCurrentStep('configure');
    onOpenChange(false);
  };

  // Loading state while destinations are loading
  if (destinationsLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Submit Trade Orders</DialogTitle>
            <DialogDescription>
              Loading destinations...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Error state if destinations failed to load
  if (destinationsError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Submit Trade Orders</DialogTitle>
            <DialogDescription>
              Failed to load submission destinations
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{destinationsError}</AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Submit Trade Orders
            <Badge variant="outline">{tradeOrders.length} orders</Badge>
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'configure' && 'Configure quantity and destination for each trade order'}
            {currentStep === 'review' && 'Review your submission before proceeding'}
            {currentStep === 'submitting' && 'Submitting your trade orders...'}
            {currentStep === 'complete' && 'Submission completed successfully'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Step: Configure */}
          {currentStep === 'configure' && (
            <>
              {/* Bulk Actions */}
              <BulkActionsSection
                destinationOptions={destinationOptions}
                onSetAllDestinations={setAllDestinations}
                onSetAllRemainingQuantities={setAllRemainingQuantities}
                statistics={statistics}
              />

              {/* Validation Summary */}
              {validationSummary.errors.length > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {validationSummary.errors.join(', ')}
                  </AlertDescription>
                </Alert>
              )}

              {submissionError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{submissionError}</AlertDescription>
                </Alert>
              )}

              {/* Configuration Table */}
              <div className="flex-1 overflow-auto">
                <TradeSubmissionTable
                  tradeOrders={tradeOrders}
                  destinationOptions={destinationOptions}
                  getSubmissionForOrder={getSubmissionForOrder}
                  onQuantityChange={setSubmissionQuantity}
                  onDestinationChange={setSubmissionDestination}
                />
              </div>
            </>
          )}

          {/* Step: Review */}
          {currentStep === 'review' && (
            <div className="flex-1 overflow-auto space-y-4">
              <SubmissionSummaryCard 
                summary={submissionSummary}
                statistics={statistics}
              />
              
              {/* Validation warnings */}
              {submissionSummary.validationSummary.warnings.length > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-1">Warnings:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {submissionSummary.validationSummary.warnings.map((warning, index) => (
                        <li key={index} className="text-sm">{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Review Table - Read-only version */}
              <div className="border rounded-lg">
                <TradeSubmissionTable
                  tradeOrders={tradeOrders}
                  destinationOptions={destinationOptions}
                  getSubmissionForOrder={getSubmissionForOrder}
                  onQuantityChange={() => {}} // Read-only
                  onDestinationChange={() => {}} // Read-only
                  readOnly={true}
                />
              </div>
            </div>
          )}

          {/* Step: Submitting */}
          {currentStep === 'submitting' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin mx-auto" />
                <div>
                  <h3 className="text-lg font-medium">Submitting Trade Orders</h3>
                  <p className="text-muted-foreground">
                    Processing {submissionData.length} orders...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step: Complete */}
          {currentStep === 'complete' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <div>
                  <h3 className="text-lg font-medium text-green-700">Submission Complete</h3>
                  <p className="text-muted-foreground">
                    Successfully submitted {statistics.totalOrders} trade orders
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          {currentStep === 'configure' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleNext}
                disabled={!canProceedToReview || submissionLoading}
              >
                Review Submission
                <Badge variant="secondary" className="ml-2">
                  {validationSummary.validCount}
                </Badge>
              </Button>
            </>
          )}

          {currentStep === 'review' && (
            <>
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!canSubmit || submissionLoading}
              >
                Submit Orders
                <Badge variant="secondary" className="ml-2">
                  {statistics.totalOrders}
                </Badge>
              </Button>
            </>
          )}

          {(currentStep === 'submitting' || currentStep === 'complete') && (
            <Button variant="outline" onClick={handleClose} disabled={currentStep === 'submitting'}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 