'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { SubmissionSummary } from '@/types/trade';

interface SubmissionSummaryCardProps {
  summary: SubmissionSummary;
  statistics: {
    totalOrders: number;
    totalQuantity: number;
    totalRemainingQuantity: number;
    averageQuantityPerOrder: number;
    uniqueDestinations: number;
  };
}

export function SubmissionSummaryCard({ summary, statistics }: SubmissionSummaryCardProps) {
  const isValid = summary.validationSummary.validCount > 0 && summary.validationSummary.invalidCount === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isValid ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          )}
          Submission Summary
        </CardTitle>
        <CardDescription>
          Review your submission details before proceeding
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {summary.totalOrders}
            </div>
            <div className="text-sm text-muted-foreground">Orders</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {summary.totalQuantity.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Quantity</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {summary.destinations.length}
            </div>
            <div className="text-sm text-muted-foreground">Destinations</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(statistics.averageQuantityPerOrder).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Avg per Order</div>
          </div>
        </div>

        {/* Validation Status */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
          <div className="flex items-center gap-2">
            {isValid ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            )}
            <span className="font-medium">Validation Status</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-600 border-green-200">
              {summary.validationSummary.validCount} Valid
            </Badge>
            
            {summary.validationSummary.invalidCount > 0 && (
              <Badge variant="outline" className="text-red-600 border-red-200">
                {summary.validationSummary.invalidCount} Invalid
              </Badge>
            )}
          </div>
        </div>

        {/* Destinations Breakdown */}
        {summary.destinations.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Destinations Breakdown</h4>
            <div className="space-y-2">
              {summary.destinations.map((dest, index) => (
                <div 
                  key={dest.destinationId} 
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div>
                    <div className="font-medium">{dest.destinationName}</div>
                    <div className="text-sm text-muted-foreground">
                      {dest.orderCount} order{dest.orderCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">
                      {dest.totalQuantity.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      quantity
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submission Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Quantity Utilization
            </div>
            <div className="text-lg">
              {summary.totalQuantity.toLocaleString()} / {statistics.totalRemainingQuantity.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              {statistics.totalRemainingQuantity > 0 
                ? `${Math.round((summary.totalQuantity / statistics.totalRemainingQuantity) * 100)}% of remaining`
                : 'No remaining quantity'
              }
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Distribution
            </div>
            <div className="text-lg">
              {summary.destinations.length > 1 ? 'Multi-destination' : 'Single destination'}
            </div>
            <div className="text-sm text-muted-foreground">
              {summary.destinations.length} destination{summary.destinations.length !== 1 ? 's' : ''} selected
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 