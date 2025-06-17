'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DestinationOption } from '@/types/trade';

interface BulkActionsSectionProps {
  destinationOptions: DestinationOption[];
  onSetAllDestinations: (destinationId: number) => void;
  onSetAllRemainingQuantities: () => void;
  statistics: {
    totalOrders: number;
    totalQuantity: number;
    totalRemainingQuantity: number;
    averageQuantityPerOrder: number;
    uniqueDestinations: number;
  };
}

export function BulkActionsSection({
  destinationOptions,
  onSetAllDestinations,
  onSetAllRemainingQuantities,
  statistics
}: BulkActionsSectionProps) {
  const [selectedDestination, setSelectedDestination] = React.useState<string>('');

  const handleSetAllDestinations = () => {
    if (selectedDestination) {
      onSetAllDestinations(parseInt(selectedDestination));
    }
  };

  const getDestinationLabel = (destinationId: string) => {
    const destination = destinationOptions.find(d => d.value.toString() === destinationId);
    return destination ? destination.label : '';
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="flex flex-col gap-4">
          {/* Statistics Row */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Orders:</span>
              <Badge variant="outline">{statistics.totalOrders}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total Quantity:</span>
              <Badge variant="outline">{statistics.totalQuantity.toLocaleString()}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Remaining:</span>
              <Badge variant="outline">{statistics.totalRemainingQuantity.toLocaleString()}</Badge>
            </div>
            {statistics.uniqueDestinations > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Destinations:</span>
                <Badge variant="outline">{statistics.uniqueDestinations}</Badge>
              </div>
            )}
          </div>

          {/* Bulk Actions Row */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Bulk Actions:</span>
            </div>
            
            {/* Set All Quantities */}
            <Button
              variant="outline"
              size="sm"
              onClick={onSetAllRemainingQuantities}
              disabled={statistics.totalOrders === 0}
            >
              Submit All Remaining
            </Button>

            {/* Set All Destinations */}
            <div className="flex items-center gap-2">
              <Select 
                value={selectedDestination} 
                onValueChange={setSelectedDestination}
              >
                <SelectTrigger className="w-[200px] h-8">
                  <SelectValue placeholder="Set all destinations" />
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
                        <div className="text-xs text-muted-foreground">
                          {destination.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSetAllDestinations}
                disabled={!selectedDestination || statistics.totalOrders === 0}
              >
                Apply to All
              </Button>
            </div>

            {selectedDestination && (
              <Badge variant="secondary" className="text-xs">
                Will set all to: {getDestinationLabel(selectedDestination)}
              </Badge>
            )}
          </div>

          {/* Helper Text */}
          <div className="text-xs text-muted-foreground">
            Use bulk actions to quickly configure all orders, then make individual adjustments as needed.
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 