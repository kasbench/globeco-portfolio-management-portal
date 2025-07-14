'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { TradeOrderEnhancedResponseDTO, DestinationOption } from '@/types/trade';
import { calculateRemainingQuantity, validateSubmissionQuantity } from '@/lib/utils/tradeUtils';
import { formatNumber } from '@/lib/utils/formatters';

interface TradeSubmissionTableProps {
  tradeOrders: TradeOrderEnhancedResponseDTO[];
  destinationOptions: DestinationOption[];
  getSubmissionForOrder: (tradeOrderId: number) => { quantity: number; destinationId: number | null } | null;
  onQuantityChange: (tradeOrderId: number, quantity: number) => void;
  onDestinationChange: (tradeOrderId: number, destinationId: number) => void;
  readOnly?: boolean;
}

export function TradeSubmissionTable({
  tradeOrders,
  destinationOptions,
  getSubmissionForOrder,
  onQuantityChange,
  onDestinationChange,
  readOnly = false
}: TradeSubmissionTableProps) {
  const handleQuantityChange = (orderId: number, value: string) => {
    if (readOnly) return;
    
    const quantity = parseInt(value) || 0;
    onQuantityChange(orderId, quantity);
  };

  const handleDestinationChange = (orderId: number, destinationId: string) => {
    if (readOnly) return;
    
    onDestinationChange(orderId, parseInt(destinationId));
  };

  const getDestinationLabel = (destinationId: number | null) => {
    if (!destinationId) return 'Select destination';
    const destination = destinationOptions.find(d => d.value === destinationId);
    return destination ? `${destination.label} - ${destination.description}` : `Destination ${destinationId}`;
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Security</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Total Qty</TableHead>
            <TableHead className="text-right">Sent</TableHead>
            <TableHead className="text-right">Remaining</TableHead>
            <TableHead className="text-right">Submit Qty</TableHead>
            <TableHead>Destination</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tradeOrders.map((order) => {
            const submission = getSubmissionForOrder(order.id);
            const remainingQuantity = calculateRemainingQuantity(order);
            const submissionQuantity = submission?.quantity || 0;
            const validation = validateSubmissionQuantity(submissionQuantity, remainingQuantity);
            const hasError = Array.isArray(validation.errors) && validation.errors.length > 0;
            const hasWarning = Array.isArray(validation.warnings) && validation.warnings.length > 0;

            return (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                
                <TableCell>
                  <div>
                    <div className="font-medium">{order.security?.ticker ?? order.securityId}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.securityId}
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <Badge variant={order.orderType === 'BUY' ? 'default' : 'secondary'}>
                    {order.orderType}
                  </Badge>
                </TableCell>
                
                <TableCell className="text-right">
                  {formatNumber(order.quantity)}
                </TableCell>
                
                <TableCell className="text-right">
                  {formatNumber(order.quantitySent)}
                </TableCell>
                
                <TableCell className="text-right">
                  <span className={remainingQuantity === 0 ? 'text-muted-foreground' : ''}>
                    {formatNumber(remainingQuantity)}
                  </span>
                </TableCell>
                
                <TableCell className="text-right">
                  {readOnly ? (
                    <span className={hasError ? 'text-red-600' : hasWarning ? 'text-yellow-600' : ''}>
                      {formatNumber(submissionQuantity)}
                    </span>
                  ) : (
                    <Input
                      type="number"
                      min="0"
                      max={remainingQuantity}
                      value={submissionQuantity}
                      onChange={(e) => handleQuantityChange(order.id, e.target.value)}
                      className={`w-24 text-right ${
                        hasError ? 'border-red-500 focus:border-red-500' : 
                        hasWarning ? 'border-yellow-500 focus:border-yellow-500' : ''
                      }`}
                      placeholder="0"
                    />
                  )}
                </TableCell>
                
                <TableCell className="min-w-[200px]">
                  {readOnly ? (
                    <span className="text-sm">
                      {getDestinationLabel(submission?.destinationId || null)}
                    </span>
                  ) : (
                    <Select
                      value={submission?.destinationId?.toString() || ''}
                      onValueChange={(value) => handleDestinationChange(order.id, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinationOptions.map((destination) => (
                          <SelectItem 
                            key={destination.value} 
                            value={destination.value.toString()}
                            disabled={destination.disabled}
                          >
                            <div>
                              <div className="font-medium">{destination.label}</div>
                              <div className="text-sm text-muted-foreground">
                                {destination.description}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    {hasError && (
                      <div className="flex items-center gap-1 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        {Array.isArray(validation.errors) && validation.errors.map((err, idx) => (
                          <span key={idx} className="text-xs">{err}</span>
                        ))}
                      </div>
                    )}
                    
                    {!hasError && hasWarning && (
                      <div className="flex items-center gap-1 text-yellow-600">
                        <AlertTriangle className="h-4 w-4" />
                        {Array.isArray(validation.warnings) && validation.warnings.map((warn, idx) => (
                          <span key={idx} className="text-xs">{warn}</span>
                        ))}
                      </div>
                    )}
                    
                    {!hasError && !hasWarning && submission?.destinationId && submissionQuantity > 0 && (
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        Ready
                      </Badge>
                    )}
                    
                    {(!submission?.destinationId || submissionQuantity === 0) && !hasError && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Pending
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      
      {tradeOrders.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No trade orders available for submission
        </div>
      )}
    </div>
  );
} 