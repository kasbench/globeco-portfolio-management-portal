import { NextRequest, NextResponse } from 'next/server';
import { orderServiceApi } from '@/lib/api/orderService';
import { logger } from '@/lib/logger';

// POST /api/orders/[id]/submit - Submit individual order
export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const requestContext = logger.createRequestContext(req);
  const url = new URL(req.url);
  
  // Log incoming request
  logger.logIncomingRequest(requestContext, url.search);
  
  try {
    const { id } = await params;
    const orderId = Number(id);
    
    logger.logApiOperation('Submit order requested', requestContext, {
      order_id: id,
      parsed_order_id: orderId
    });
    
    if (isNaN(orderId)) {
      logger.warn('Invalid order ID provided', {
        request_id: requestContext.requestId,
        correlation_id: requestContext.correlationId,
        order_id: id,
        endpoint: requestContext.path
      });
      
      const response = NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
      logger.logCompletedRequest(requestContext, 400);
      return response;
    }

    logger.logServiceOperation('Submitting order', requestContext, 'submit_order', {
      order_id: id
    });

    const result = await orderServiceApi.submitOrder(orderId);
    
    logger.logServiceOperation('Successfully submitted order', requestContext, 'submit_order', {
      order_id: id,
      result_status: result.statusId || 'unknown'
    });
    
    logger.logApiOperation('Successfully submitted order', requestContext, {
      order_id: id
    });

    const response = NextResponse.json(result);
    logger.logCompletedRequest(requestContext, 200, JSON.stringify(result).length);
    return response;
    
  } catch (error: any) {
    const { id } = await params;
    
    logger.logError('Failed to submit order', error, requestContext, {
      order_id: id,
      operation: 'submit_order'
    });
    
    const statusCode = error.status || 500;
    let errorMessage = error.message || 'Failed to submit order';
    
    // Handle specific error cases
    if (error.status === 404) {
      errorMessage = 'Order not found';
    } else if (error.status === 400) {
      errorMessage = error.message || 'Invalid order data';
    } else if (error.status === 409) {
      errorMessage = 'Order conflict - order may have been modified';
    }

    const response = NextResponse.json({ error: errorMessage }, { status: statusCode });
    logger.logCompletedRequest(requestContext, statusCode);
    return response;
  } finally {
    logger.cleanupRequestContext(requestContext.requestId);
  }
}